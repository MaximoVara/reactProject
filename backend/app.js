const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const app = express();
const SOURCE = "https://www.visitindy.com/indianapolis-things-to-do-events";
const PORT = process.env.PORT || 9000;

app.use(cors());

const p = {
	/**
	 * @type { puppeteer.Browser }
	 */
	browser: null
};

(async () => {
	p.browser = await puppeteer.launch({
        args: [
          '--window-size=1920,1080'
        ]
      });

	await scrapePage(1); // need to do this to "warm up" the context
})();

/**
 * @returns { number }
 */
const extractMaxPages = async () => {
	const page = await p.browser.newPage();

	await page.goto(SOURCE);

	const container = await page.waitForSelector("#multipage_controls > div > div");
	
	const a = await container.$$eval("a", elements => (
		elements.map(element => element.getAttribute("aria-label"))
	));

	await page.close();

	return parseInt(a[a.length - 2].replace("Page ", ""));
};

/**
 * @param {number} index 
 * @returns { Promise<Array<{ title: string, img: string, eventURL: string, address: string, date: string, time: string }>> }
 */
const scrapePage = async (index) => {
	const url = `${SOURCE}?page=${index}`;

	const page = await p.browser.newPage();

	await page.goto(url);

	const container = await page.waitForSelector("#landing_search_results div.container div.row");
		
	const result = await container.$$eval(".list-grid-item", (elements) => 
		elements.filter(e => {
			var mystring = e.querySelector(".styled")
			if(	mystring != null ){
				// Tried to get rid of pages what only have phone number and no address.
				// Only works because address comes first everytime.
				var regex = new RegExp("\\d{3}-\\d{3}-\\d{4}");
				console.log(mystring.textContent);
				return !(regex.test(mystring.textContent));
				// return mystring.textContent.match(regex);
			} else {
				return false
			}
		})
		.map(n => (
			{
				title: n.querySelector(".list-title").textContent,
				img: n.querySelector(".list-image a img").getAttribute("src"),
				eventURL: n.querySelector(".list-title > a").getAttribute("href"),
				address: n.querySelector(".styled").textContent,
				date: (() => {
					/**
					 * @type { Element }
					 */
					let listInfo = null;
					
					if(listInfo = n.querySelector(".list-info")) {
						return listInfo.textContent.replace("Date:", "").trim()
					}

					return null;
				})(),
				time: (() => {
					/**
					 * @type { Element }
					 */
					let listInfo = null;

					if(listInfo = n.querySelector(".list-info.mb-2")) {
						return listInfo.textContent.replace("Time:", "").trim();
					}

					return null;
				})()
			}
		))
	);

	await page.close();

	return result;
};

app.get("/", (req, res) => {
	res.json({
		message: "Hi"
	});
});

app.get("/dummyData", (req, res) => {
	res.json({
        count: 23,
        results: [
        {
            title: "title1",
            img: "dummy",
            eventURL: "imgur.com",
            address: "123 ABC Walnut Creek, CA",
            date: "today",
            time: "noon",
            message: "Hi"
        },
        {
            title: "title2",
            img: "dummy2",
            eventURL: "imgur.com",
            address: "456 DEF Walnut Creek, CA",
            date: "tomorrow",
            time: "evening",
            message: "Bye"
        }
    ]});
});

app.get("/vi/:page?", async (req, res) => {
	try {
		const results = await scrapePage(req.params.page || 1);

		return res.json({
			count: results.length,
			results
		})
	} catch(e) {
		return res.status(500).json({
			message: e.message
		})
	}
});

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}...`);
});