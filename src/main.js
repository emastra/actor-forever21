const Apify = require('apify');
const { log } = Apify.utils;

const {
  enqueueSubcategories,
  extractSubcatPage,
  enqueueNextPages,
  extractProductPage
} = require('./extractors');

const {
  validateInput,
  getProxyUrls,
  checkAndCreateUrlSource,
  maxItemsCheck,
  checkAndEval,
  applyFunction
} = require('./utils');

const { BASE_URL } = require('./constants');


Apify.main(async () => {
  const input = await Apify.getInput();
  validateInput(input);

  const {
    startUrls,
    maxItems = null,
    extendOutputFunction = null,
    proxyConfiguration
  } = input;

  // create proxy url(s) to be used in crawler configuration
  const proxyUrls = getProxyUrls(proxyConfiguration);

  // initialize request list from url sources
  const sources = checkAndCreateUrlSource(startUrls);
  const requestList = await Apify.openRequestList('start-list', sources);

  // open request queue
  const requestQueue = await Apify.openRequestQueue();

  // open dataset
  const dataset = await Apify.openDataset();

  // crawler config
  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    maxRequestRetries: 3,
    handlePageTimeoutSecs: 240,
    requestTimeoutSecs: 120,
    proxyUrls,

    handlePageFunction: async ({ request, body, $ }) => {
      // if exists, check items limit. If limit is reached crawler will exit.
      if (maxItems) await maxItemsCheck(maxItems, dataset, requestQueue);

      log.info('Processing:', request.url);
      const { label } = request.userData;

      //

      if (label === 'HOMEPAGE') {
        const totalEnqueued = await enqueueSubcategories($, requestQueue);

        log.info(`Enqueued ${totalEnqueued} subcategories from the homepage.`);
      }

      if (label === 'MAINCAT') {
        const cat = request.url.replace(BASE_URL, '');
        const totalEnqueued = await enqueueSubcategories($, requestQueue, cat);

        log.info(`Enqueued ${totalEnqueued} subcategories from ${request.url}`);
      }

      if (label === 'SUBCAT') {
        const { urls, totalPages } = await extractSubcatPage($);

        const isPageOne = !(request.url.split('#')[1]);

        if (isPageOne) {
          await enqueueNextPages(request, requestQueue, totalPages);
        }

        // enqueue products of the current page
        for (const url of urls) {
          if (url) {
            await requestQueue.addRequest({
              url,
              userData: { label: 'PRODUCT'}
            });
          }
        }

        log.info(`Added ${urls.length} products from ${request.url}`);
      }

      if (label === 'PRODUCT') {
        let items = await extractProductPage($, request);

        if (extendOutputFunction) {
          const evaledFunc = checkAndEval(extendOutputFunction);
          items = await applyFunction($, evaledFunc, items);
        }

        await dataset.pushData(items);
        items.forEach((item) => {
          log.info('Product pushed:', item.itemId, item.color);
        });

      }
    },

    handleFailedRequestFunction: async ({ request }) => {
      log.warning(`Request ${request.url} failed too many times`);

      await dataset.pushData({
        '#debug': Apify.utils.createRequestDebugInfo(request)
      });
    }
  });

  log.info('Starting crawler.');
  await crawler.run();

  log.info('Crawler Finished.');
});
