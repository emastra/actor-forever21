## Forever21 Scraper

Forever21 Scraper is an [Apify actor](https://apify.com/actors) for extracting product data from [forever21.com](https://www.forever21.com) fashion on line store. It allows you to scrape the whole site, specific categories and products. It is build on top of [Apify SDK](https://sdk.apify.com/) and you can run it both on [Apify platform](https://my.apify.com) and locally.

- [Input](#input)
- [Output](#output)
- [Compute units consumption](#compute-units-consumption)
- [Extend output function](#extend-output-function)

### Input

| Field | Type | Description |
| ----- | ---- | ----------- |
| startUrls | array | (required) List of [Request](https://sdk.apify.com/docs/api/request#docsNav) objects that will be deeply crawled. The URLs can be the home page `https://www.forever21.com` or a combination of top-level categories, sub-categories and product page URLs |
| maxItems | number | (optional) Maximum number of product items to be scraped |
| extendOutputFunction | string | (optional) Function that takes a JQuery handle ($) as argument and returns data that will be merged with the default output. More information in [Extend output function](#extend-output-function) |
| proxyConfiguration | object | (optional) Proxy settings of the run. If you have access to Apify proxy, leave the default settings. If not, you can set `{ "useApifyProxy": false" }` to disable proxy usage |

**Notes on the input**
- Each category has a few special sub-category (not containing any products) which will not be crawled and scraped. If this kind of URLs are included in the `startUrls`, the actor prints a warning on start up.
- When `maxItems` is set, the total results may be slightly greater. This is because the actor waits for pending requests to complete and because each product on the website may produce more than one item (derived from every color variants of the products).

INPUT Example:

```
{
  "startUrls": [
    "https://www.forever21.com/us/shop/catalog/category/f21/women-main",
    "https://www.forever21.com/us/shop/catalog/category/plus/plus_size-activewear",
    "https://www.forever21.com/us/shop/catalog/category/21men/mens-sweaters",
    "https://www.forever21.com/us/shop/catalog/product/girls/girls_main/2000386827"
  ],
  "maxItems": 1000,
  "extendOutputFunction": "($) => { return { test: 1234, test2: 5678 } }",
  "proxyConfiguration": {
    "useApifyProxy": true
  }
}
```

### Output

Output is stored in a dataset. Each item is information about one product. A single product on the website produces an item for each color variant.

Example of one item output:

```
{
  "source": "forever21",
  "itemId": "2000393583",
  "url": "https://www.forever21.com/us/shop/catalog/product/f21/sweater/2000393583",
  "scrapedAt": "2019-12-18T11:00:15.171Z",
  "brand": "F21",
  "title": "Ribbed Twist-Hem Sweater",
  "categories": [
    "women + acc",
    "tops"
  ],
  "description": "A ribbed knit sweater featuring a V-neckline, long sleeves, and a twisted hem.- This is an independent brand and not a Forever 21 branded item.Content + Care- 100% acrylic- Hand wash coldSize + Fit- Model is 5'9\" and wearing a Small",
  "composition": "100% acrylic",
  "price": 32,
  "salePrice": 32,
  "currency": "USD",
  "gender": "female",
  "color": "mauve",
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
      "url": "https://www.forever21.com/images/1_front_750/00393583-01.jpg"
    },
    {
      "url": "https://www.forever21.com/images/2_side_750/00393583-01.jpg"
    },
    {
      "url": "https://www.forever21.com/images/3_back_750/00393583-01.jpg"
    },
    {
      "url": "https://www.forever21.com/images/4_full_750/00393583-01.jpg"
    }
  ]
}
```

### Compute units consumption
The actor uses [CheerioCrawler](https://sdk.apify.com/docs/api/cheeriocrawler) which has low consumption.

With 4096MB of RAM set for the actor, the average compute units per **1000** scraped pages is **0.3207**.

Keep in mind that it is much more efficient to run one longer scrape (at least one minute) than more shorter ones because of the startup time.

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
