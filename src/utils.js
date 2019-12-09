const Apify = require('apify');
const { log } = Apify.utils;

const { PROXY_DEFAULT_COUNTRY } = require('./constants');

function validateInput(input) {
  if (!input) throw new Error('INPUT is missing.');

  // validate function
  const validate = (inputKey, type = 'string') => {
    const value = input[inputKey];

    if (type === 'array') {
      if (!Array.isArray(value)) {
        throw new Error(`Value of ${inputKey} should be array`);
      }
    }
    else if (value) {
      if (typeof value !== type) {
        throw new Error(`Value of ${inputKey} should be ${type}`);
      }
    }
  };

  // check required field
  if (!input.startUrls && input.startUrls.length <= 0) {
    throw new Error('INPUT "startUrls" property is required');
  }

  // check correct types
  validate('startUrls', 'array');
  validate('maxItems', 'number');
  validate('extendOutputFunction', 'string');
  validate('proxyConfiguration', 'object');
}

function getProxyUrls(proxyConfiguration) {
  const { useApifyProxy, proxyUrls = [], apifyProxyGroups } = proxyConfiguration;

  // if no custom proxy is provided, set proxyUrls
  if (proxyUrls.length === 0) {
    if (!useApifyProxy) return undefined;

    const proxyUrl = Apify.getApifyProxyUrl({
      password: process.env.APIFY_PROXY_PASSWORD,
      groups: apifyProxyGroups,
      country: PROXY_DEFAULT_COUNTRY
    });

    proxyUrls.push(proxyUrl);
  }

  return proxyUrls;
}

function checkAndCreateUrlSource(startUrls) {
  const sources = [];

  for (const url of startUrls) {
    // if url is the homepage
    if (url === 'https://www.forever21.com') {
      sources.push({ url, userData: { label: 'HOMEPAGE' } });
    }
    // if top-level category
    else if (/-main|_main/.test(url)) {
      sources.push({ url, userData: { label: 'MAINCAT' } });
    }
    // if sub-category page
    else if (url.includes('catalog/category/')) {
      sources.push({ url, userData: { label: 'SUBCAT' } });
    }
    // if product page
    else if (/[0-9]{8,12}$/.test(url)) {
      sources.push({ url, userData: { label: 'PRODUCT' } });
    }
    else {
      // unsupported or bad formatted urls get here.
      log.warning(`The following url has not been added to the queue: ${url}.\nIt may be due to unsupported or incorrect url. For more information, have a look at the actor documentation, "input" section.`);
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
}

function checkAndEval(extendOutputFunction) {
  let evaledFunc;

  try {
      evaledFunc = eval(extendOutputFunction);
  } catch (e) {
      throw new Error(`extendOutputFunction is not a valid JavaScript! Error: ${e}`);
  }

  if (typeof evaledFunc !== "function") {
      throw new Error(`extendOutputFunction is not a function! Please fix it or use just default output!`);
  }

  return evaledFunc;
}

async function applyFunction($, evaledFunc, items) {
  const isObject = (val) => typeof val === 'object' && val !== null && !Array.isArray(val);

  let userResult = {};
  try {
    userResult = await evaledFunc($);
  } catch (err) {
    log.error(`extendOutputFunction crashed! Pushing default output. Please fix your function if you want to update the output. Error: ${err}`);
  }

  if (!isObject(userResult)) {
    log.exception(new Error('extendOutputFunction must return an object!'));
    process.exit(1);
  }

  items.forEach((item, i) => {
    items[i] = { ...item, ...userResult };
  });

  return items;
}

module.exports = {
  validateInput,
  getProxyUrls,
  checkAndCreateUrlSource,
  maxItemsCheck,
  checkAndEval,
  applyFunction
}
