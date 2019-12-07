const Apify = require('apify');
const { log } = Apify.utils;

const {
  extractSubcatPage,
  extractProductPage,
} = require('./extractors');

const {
  checkAndEval,
  checkAndCreateUrlSource,
  setUpProxy,
  maxItemsCheck,
  enqueueNextPages,
  enqueueAllSupportedCategories,
  applyFunction
} = require('./utils');

// constants
// const BASE_URL = 'https://www.forever21.com';


////////////////////////////////////////////////////////////////////////////////

Apify.main(async () => {
  // manage input
  const input = await Apify.getValue('INPUT');
  if (!input) throw new Error('INPUT is missing.');
  if (!input.startUrls) throw new Error('INPUT "startUrls" property is required');
  // defaults
  if (!input.proxyConfiguration) input.proxyConfiguration = { country: 'US' };

  // extract input variables
  const {
    startUrls,
    maxItems = null,
    extendOutputFunction = null,
    proxyConfiguration
  } = input;

  // check extended
  let evaledExtendOutputFunction;
  if (extendOutputFunction) {
    evaledExtendOutputFunction = checkAndEval(extendOutputFunction);
  }

  // proxy management
  const proxyUrls = setUpProxy(proxyConfiguration);

  const sources = checkAndCreateUrlSource(startUrls);

  const requestList = new Apify.RequestList({ sources });
  await requestList.initialize();

  const requestQueue = await Apify.openRequestQueue();

  const dataset = await Apify.openDataset();


  //////////////////////////////////////////////////////////////////////////////

  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    maxRequestRetries: 3,
    handlePageTimeoutSecs: 240,
    requestTimeoutSecs: 120,
    proxyUrls,


    ////////////////////////////////////////////////////////////////////////////

    handlePageFunction: async ({ request, body, $ }) => {
      // check items limit
      const limitReached = await maxItemsCheck(maxItems, dataset, requestQueue);
      if (limitReached) {
        log.info(`Actor reached the max items limit. Crawler is going to halt...`);
        process.exit();
      }

      log.info('Processing:', request.url);
      const { label } = request.userData;

      //

      if (label === 'HOMEPAGE') {
        const totalEnqueued = await enqueueAllSupportedCategories($, requestQueue);

        log.info(`Enqueued ${totalEnqueued} categories from the homepage.`);
      } // fine HOMEPAGE

      if (label === 'SUBCAT') {
        const { urls, totalPages } = await extractSubcatPage($);

        const isPageOne = !Boolean(request.url.split('#')[1]);
        log.info('totalPages: ' + totalPages + '. isPageOne: ' + isPageOne, '. url: ' + request.url);

        if (isPageOne) {
          await enqueueNextPages(request, requestQueue, totalPages);
        }

        // enqueue products of the current page
        for (const url of urls) {
          await requestQueue.addRequest({
            url,
            userData: { label: 'PRODUCT'}
          });
        }

        log.info(`Added ${urls.length} products from ${request.url}`);
      } // fine SUBCAT

      if (label === 'PRODUCT') {
        let items = await extractProductPage($, request);

        if (evaledExtendOutputFunction) {
          items = await applyFunction($, evaledExtendOutputFunction, items);
        }

        await Apify.pushData(items);
        items.forEach((item) => {
          log.info('Product pushed:', item.itemId, item.color);
        });

      } // fine PRODUCT
    },

    handleFailedRequestFunction: async ({ request }) => {
      log.warning(`Request ${request.url} failed too many times.`);
    }
  });

  log.info('Starting crawler.');
  await crawler.run();

  log.info('Crawler Finished.');
});
