## Forever21 Scraper

Forever21 Scraper is an [Apify actor](https://apify.com/actors) for extracting product data from [forever21.com](https://www.forever21.com) on line fashion store. It allows you to scrape the whole site, specific categories and products. It is build on top of [Apify SDK](https://sdk.apify.com/) and you can run it both on [Apify platform](https://my.apify.com) and locally.

- [Input](#input)
- [Output](#output)
- [Compute units consumption](#compute-units-consumption)
- [Extend output function](#extend-output-function)

### Input

| Field | Type | Description | Default value
| ----- | ---- | ----------- | -------------|
| startUrls | array | List of [Request](https://sdk.apify.com/docs/api/request#docsNav) objects that will be deeply crawled. The URLs can be the home page `https://www.forever21.com` or the top-level categories, the sub-categories and product page URLs | `[{ "url": "https://www.forever21.com" }]`|
| maxItems | number | Maximum number of product items to be scraped | all found |
| extendOutputFunction | string | Function that takes a JQuery handle ($) as argument and returns data that will be merged with the default output. More information in [Extend output function](#extend-output-function) | |
| proxyConfiguration | object | Proxy settings of the run. If you have access to Apify proxy, leave the default settings. If not, you can set `{ "useApifyProxy": false" }` to disable proxy usage | `{ "useApifyProxy": true }`|

**Notes on the input**
- Each category has a few special sub-category (not containing any products) which will not be crawled and scraped. If this kind of URLs are included in the `startUrls`, the actor prints a warning on start up.
- When `maxItems` is set, the total results may be slightly greater. This is because the actor waits for pending requests to be complete and because each product on the website may produce more than one item (based on color variants).

### Output

Output is stored in a dataset. Each item is information about one product. A single product on the website produces an item for each color variant.

Example of one output item:

```
{
  "source": "forever21",
  "itemId": "2000391313",
  "url": "https://www.forever21.com/us/shop/catalog/product/f21/activewear/2000391313",
  "scrapedAt": "2019-12-06T10:45:47.542Z",
  "brand": "F21",
  "title": "High Impact - Patternblock Sports Bra",
  "categories": [
    "women + acc",
    "activewear",
    "high impact - patternblock sports bra"
  ],
  "description": "A knit high-impact sports bra featuring a patternblock design, scoop neck, racerback, removable cups, and an elasticized waist.- Matching bottoms available.Content + Care- 50% nylon, 43% polyester, 7% spandex- Machine wash coldSize + Fit- Model is 5'10\" and wearing a Small",
  "composition": "50% nylon, 43% polyester, 7% spandex",
  "price": 14.99,
  "salePrice": 14.99,
  "currency": "USD",
  "gender": "female",
  "color": "black/mauve",
  "sizes": [
    "Small",
    "Medium",
    "Large"
  ],
  "availableSizes": [
    "Small",
    "Medium",
    "Large"
  ],
  "images": [
    {
      "src": "https://www.forever21.com/images/1_front_750/00391313-01.jpg"
    }
  ]
}
```

### Compute units consumption
Keep in mind that it is much more efficient to run one longer scrape (at least one minute) than more shorter ones because of the startup time.

The actor uses [CheerioCrawler](https://sdk.apify.com/docs/api/cheeriocrawler) which has a the lowest CU consumption.

Average compute units per **1000** scraped pages: **0.3207**

### Extend output function

You can use this function to update the default output of this actor. This function gets a JQuery handle `$` as an argument so you can choose what data from the page you want to scrape. The output from this will function will get merged with the default output.

The **return value** of this function has to be an **object**!

You can return fields to achieve 3 different things:
- Add a new field - Return object with a field that is not in the default output
- Change a field - Return an existing field with a new value
- Remove a field - Return an existing field with a value `undefined`

The following example will change the `title` field, remove the `gender` field and add a new field:
```
($) => {
    return {
        title: 'This is a new title',
        gender: undefined,
        myNewField: 1234
    }
}
```

### Open an issue
If you find any bug, please create an issue on the actor [Github page](https://github.com/emastra/actor-forever21).
