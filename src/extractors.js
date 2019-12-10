const Apify = require('apify');
const { log } = Apify.utils;
const cheerio = require('cheerio');

const { BASE_URL } = require('./constants');

async function enqueueSubcategories($, requestQueue, cat = null) {
  let menuCats = $('div.d_new_mega_menu').toArray();
  let totalEnqueued = 0;

  // if this function is used to extract subcategories from single main cat,
  // keep only the single relevant div
  if (cat) {
    menuCats = menuCats.filter(menuDiv => $(menuDiv).children().first().attr('href') === cat);
  }

  for (const menuDiv of menuCats) {
    const hrefs = $(menuDiv).find('a').toArray().map(a => a.attribs.href);

    // filter out unsupported categories
    const supportedHrefs = hrefs.filter((href) => {
      if (/-main|_main/.test(href)) return false;
      if (!href.includes('catalog/category/')) return false;

      return true;
    });

    totalEnqueued += supportedHrefs.length;

    for (const href of supportedHrefs) {
      await requestQueue.addRequest({
        url: BASE_URL + href,
        userData: { label: 'SUBCAT' }
      });
    }

  }

  if (cat) {
    log.info(`Added all subcategories from main category ${cat}.`);
  } else {
    log.info(`Added all subcategories from all main categories of the home page.`);
  }

  return totalEnqueued;
}

async function extractSubcatPage($) {
  const scriptContent = $('script:contains("var cData")').html();
  const start = scriptContent.indexOf('var cData = ');
  const end = scriptContent.indexOf('console.log(cData);');
  const dataString = scriptContent.substring(start, end);

  const cData = JSON.parse(dataString.replace('var cData = ', '').substring(0, dataString.indexOf('};')).trim().slice(0, -1));
  const catalogProducts = cData.CatalogProducts;
  const totalRecords = cData.TotalRecords;
  if (!catalogProducts || !totalRecords) {
    // console.log(cData);
    throw new Error('Web page missing critical data source');
  }
  // log.info('length of catalogProducts: ' + catalogProducts.length + '. TotalRecords: ' + totalRecords);

  const urls = catalogProducts.map(item => item.ProductShareLinkUrl.toLowerCase());
  const totalPages = Math.ceil(totalRecords / 120);

  return { urls, totalPages };
}

async function enqueueNextPages(request, requestQueue, totalPages) {
  const currentBaseUrl = request.url.split('#')[0];

  // add all successive pages for this subcat
  for (let i = 2; i <= totalPages; i++) {
    const info = await requestQueue.addRequest({
      url: `${currentBaseUrl}#pageno=${i}`,
      keepUrlFragment: true,
      userData: { label: 'SUBCAT'}
    });

    log.info('Added', info.request.url);
  }

}

async function extractProductPage($, request) {
  const scriptContent = $('script:contains("var pData")').html();
  if (!scriptContent) throw new Error('Web page missing critical data source');

  const start = scriptContent.indexOf('var pData = ') + 12;
  const end = scriptContent.length;

  let dataString = scriptContent.substr(start, end);
  dataString = dataString.substr(0, dataString.indexOf('brand =')).trim();
  dataString = dataString.substr(0, dataString.length - 1);

  const parsedData = JSON.parse(dataString);
  const jsonLDContent = cheerio.load(parsedData.CrawlableBreadCrumb)('script')[0].children[0].data;
  const breadcrumbArray = JSON.parse(jsonLDContent).itemListElement;
  const parsedDesc = cheerio.load(parsedData.Description);
  const gseo = cheerio.load(parsedData.GSEO);
  const variants = parsedData.Variants;
  const baseImageUrl = 'https://www.forever21.com/images/1_front_750/';

  const items = [];

  // create an item for each color
  for (let i = 0; i < variants.length; i++) {
    const item = Object.create(null);

    item.source = 'forever21';
    item.itemId = parsedData.ProductId;
    item.url = request.url;
    item.scrapedAt = new Date().toISOString();
    item.brand = parsedData.Brand;
    item.title = parsedData.DisplayName;
    item.categories = breadcrumbArray.map(item => item.item.name.toLowerCase());
    item.description = parsedDesc.text().replace(/^Details/, '');
    const descChip = item.description.substring(item.description.indexOf('Content + Care-')).replace('Content + Care- ', '');
    item.composition = descChip.substring(0, descChip.indexOf('-'));
    item.price = variants[i].OriginalPrice;
    item.salePrice = variants[i].ListPrice || parsedData.ListPrice;
    item.currency = JSON.parse(gseo('script')[0].children[0].data).offers.priceCurrency;
    const itemGender = parsedData.ProductSizeChart.toLowerCase();
    item.gender = itemGender === 'women' ? 'female' : (itemGender === 'men' ? 'male' : null);
    item.color = variants[i].ColorName.toLowerCase();
    item.sizes = variants[i].Sizes.map(obj => obj.SizeName);
    item.availableSizes = variants[i].Sizes.filter(obj => obj.Available).map(obj => obj.SizeName);
    item.images = [{ src: `${baseImageUrl}${parsedData.ItemCode}-${variants[i].ColorId}.jpg` }];

    items.push(item);
  }

  return items;
}

module.exports = {
  enqueueSubcategories,
  extractSubcatPage,
  enqueueNextPages,
  extractProductPage
}
