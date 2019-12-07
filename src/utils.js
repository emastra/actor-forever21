const Apify = require('apify');
const { log } = Apify.utils;

function checkAndEval(extendOutputFunction) {
  let evaledExtendOutputFunction;

  try {
      evaledExtendOutputFunction = eval(extendOutputFunction);
  } catch (e) {
      throw new Error(`extendOutputFunction is not a valid JavaScript! Error: ${e}`);
  }

  if (typeof evaledExtendOutputFunction !== "function") {
      throw new Error(`extendOutputFunction is not a function! Please fix it or use just default output!`);
  }

  return evaledExtendOutputFunction;
}

function setUpProxy(proxyConfiguration) {
  const { customProxyUrls } = proxyConfiguration;

  if (!customProxyUrls) {
    let username = '';

    if (proxyConfiguration.groups) username += `groups-${proxyConfiguration.groups},`;
    username += `country-${proxyConfiguration.country}`;

    const password = process.env.APIFY_PROXY_PASSWORD;

    const proxyUrl = `http://${username}:${password}@proxy.apify.com:8000`;
    log.info(`Proxy url has been setup: http://${username}:*****@proxy.apify.com:8000`);

    return [ proxyUrl ];
  }
  else {
    return customProxyUrls;
  }
}

function checkAndCreateUrlSource(startUrls) {
  const sources = [];

  for (const url of startUrls) {
    // if url is the homepage
    if (url === 'https://www.forever21.com') {
      sources.push({ url, userData: { label: 'HOMEPAGE' } });
    }
    else if (/-main|_main/.test(url)) {
      // log.warning(`The following url has not been added to the queue: ${url}.\nPlease choose a url from the sub-menu of the category. For more information, have a look at the actor documentation under "INPUT guidelines".`);
      sources.push({ url, userData: { label: 'MAINCAT' } });
    }
    // if it's a category page
    else if (url.includes('catalog/category/')) {
      sources.push({ url, userData: { label: 'SUBCAT' } });
    }
    // if it's a product page
    else if (/[0-9]{8,12}$/.test(url)) {
      sources.push({ url, userData: { label: 'PRODUCT' } });
    }
    else {
      // manage error here
      log.warning(`The following url has not been added to the queue: ${url}.\nIt may be due to incorrect format or unsupported url. For more information, have a look at the actor documentation under "INPUT guidelines".`);
    }
  }

  return sources;
}

async function maxItemsCheck(maxItems, dataset, requestQueue) {
  const { itemCount } = await dataset.getInfo();

  if (itemCount >= maxItems) {
    log.info(`Actor reached the max items limit. Crawler is going to halt...`);
    log.info('Crawler Finished.');
    process.exit();
  }

  // return itemCount >= maxItems
}

async function applyFunction($, evaledExtendOutputFunction, items) {
  const isObject = (val) => typeof val === 'object' && val !== null && !Array.isArray(val);

  let userResult = {};
  try {
    userResult = await evaledExtendOutputFunction($);
  } catch (err) {
    console.log(`extendOutputFunction crashed! Pushing default output. Please fix your function if you want to update the output. Error: ${e}`);
  }

  if (!isObject(userResult)) {
    console.log('extendOutputFunction must return an object!!!');
    process.exit(1);
  }

  items.forEach((item, i) => {
    items[i] = { ...item, ...userResult };
  });

  return items;
}

module.exports = {
  checkAndEval,
  setUpProxy,
  checkAndCreateUrlSource,
  maxItemsCheck,
  applyFunction,
}
