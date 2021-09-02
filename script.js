import puppeteer from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { EVENT_URL, IS_FOR_REAL, MINIMUM_PRICE, puppeteerConfig, CARDHOLDER_NAME, CREDIT_CARD_NUMBER, CVC, EXPIRATION_DATE } from './constants.js';

puppeteer.use(StealthPlugin()).use(RecaptchaPlugin());

puppeteer.launch(puppeteerConfig).then(async browser => {
  console.log('😎 started!');
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 768 })
  await page.goto(EVENT_URL);
  const [noTicketAvailableElement] = await page.$x("//h3[contains(., 'No tickets available')]");
  const [loginButton] = await page.$x("//button[contains(., 'Login')]");
  if (loginButton) {
    console.log("🚨 warning: the browser is currently not logged in, you may want to login on Google Chrome manually to make sure it works")
    await page.waitForTimeout(120000)
    await loginButton.click();
    const [facebookButton] = await page.$x("/html/body/ticketswap-portal[7]/div/div/div/div/div/div/div/button[1]");
    if (facebookButton) {
      console.log('trying to log in...')
      hadToLogin = true;
      await facebookButton.click()
      await page.waitForTimeout(10000);
    }

  }
  if (noTicketAvailableElement) {
    console.log('No tickets available 😢\n');
    return await browser.close();
  }
  await page.waitForSelector("ul[data-testid='available-tickets-list']");
  const availableTickets = await page.$("ul[data-testid='available-tickets-list']");

  if (availableTickets) {
    console.log('👀 looks like there is a ticket available')
    const ticketLink = await page.$("ul[data-testid='available-tickets-list'] > li > a")
    if (ticketLink) {
      ticketLink.click();
      await page.waitForSelector("span[data-testid='total-price']");
      const ticketPriceElement = await page.$("span[data-testid='total-price']");
      const ticketPriceString = await ticketPriceElement.evaluate(node => node.innerText);
      const ticketPrice = Number(ticketPriceString && ticketPriceString.replace('€', ''));
      console.log(`The ticket's price is ${ticketPrice} euros`);

      // verifying wether it's a ticket for the event or something else (eg bus ticket)
      const isRealTicket = ticketPrice > MINIMUM_PRICE;
      const [buyButton] = await page.$x("//button[contains(., 'Buy ticket')]"); // using xPath expression to target button with specific text

      if (isRealTicket && buyButton) {
        buyButton.click();
        await page.waitForTimeout(2000)
        let hadToLogin = false;

        // login with Facebook if needed
        const [facebookButton] = await page.$x("/html/body/ticketswap-portal[7]/div/div/div/div/div/div/div/button[1]");
        if (facebookButton) {
          console.log('trying to log in...')
          hadToLogin = true;
          facebookButton.click()
          await page.waitForTimeout(10000);
        }

        const [totalPriceElement] = await page.$x("//*[@id='__next']/div/div[1]/div/footer/strong");

        if (hadToLogin) {
          if (!totalPriceElement) {
            console.log('Facebook login failed 😭 Make sur you are connected to Facebook en Google Chrome')
            return browser.close();
          }
          console.log('Login went fine')
        }

        const alternativeTotalPriceElement = await page.$("span[data-testid='total-price']");
        let totalPriceString = await totalPriceElement.evaluate(node => node.innerText)
        if (!totalPriceString) {
          totalPriceString = await alternativeTotalPriceElement.evaluate(node => node.innerText);
        }
        const totalPrice = Number(totalPriceString.replace('Total €', ''));

        // compare ticketPrice and totalPrice to make sure there is nothing else in the cart
        const pricesAreEqual = ticketPrice === totalPrice;

        if (pricesAreEqual) {
          const [continueButton] = await page.$x("//button[contains(., 'Continue')]");
          if (continueButton) {
            await continueButton.click();
            console.log(`I think I'm gonna buy that ticket for ${totalPrice} euros 😍`)

            // find the paymentOptions dropdown
            await page.waitForSelector("#paymentOption");
            const paymentMethodInput = await page.$("#paymentOption");
            await paymentMethodInput && paymentMethodInput.click();

            // find the Credit card option in the payments dropdown
            await page.waitForXPath("//li[contains(., 'Credit or debit card')]");
            let [creditOrDebitCard] = await page.$x("//li[contains(., 'Credit or debit card')]");
            const alternativeCreditOrDebitCard = await page.$('li[id^=paymentOption-item-STRIPE_MONEY_MACHINE_CREDITCARD]');
            creditOrDebitCard && creditOrDebitCard.click();

            if (!creditOrDebitCard) {
              alternativeCreditOrDebitCard && alternativeCreditOrDebitCard.click();
            }

            // wait for payment form to be mounted
            await page.waitForSelector("#card > div > iframe");

            // target cardNumberInput
            const cardNumberIframeElement = await page.$("#card > div > iframe");
            const cardNumberIframe = await cardNumberIframeElement.contentFrame();
            await cardNumberIframe.waitForSelector('#root > form > span:nth-child(4) > div > div.CardNumberField-input-wrapper > span > input');
            const cardNumberInput = await cardNumberIframe.$("#root > form > span:nth-child(4) > div > div.CardNumberField-input-wrapper > span > input")

            // target expirationDateInput
            const expirationDateIframeElement = await page.$("#expiry > div > iframe");
            const expirationDateIframe = await expirationDateIframeElement.contentFrame();
            await  expirationDateIframe.waitForSelector('#root > form > span:nth-child(4) > span > input');
            const expirationDateInput = await expirationDateIframe.$('#root > form > span:nth-child(4) > span > input');

            // target CVC input
            const cvcInputIframeElement = await page.$('#cvc > div > iframe');
            const cvcInputIframe = await  cvcInputIframeElement.contentFrame();
            await cvcInputIframe.waitForSelector('#root > form > span:nth-child(4) > span > input');
            const cvcInput = await cvcInputIframe.$('#root > form > span:nth-child(4) > span > input');

            // target cardholderNameInput
            const cardholderNameInput = await page.$("input[name='ccname']");

            // type in each input
            await cardNumberInput.type(CREDIT_CARD_NUMBER, { delay: 100 }); // some inputs require a delay for the typing to work
            await expirationDateInput.type(EXPIRATION_DATE, { delay: 100 });
            await cvcInput.type(CVC, { delay: 100 });
            await cardholderNameInput.type(CARDHOLDER_NAME);

            // find continue button and click
            await page.waitForXPath("//*[@id='__next']/div/div[1]/div/nav/div[2]/button");
            const [paymentContinueButton] = await page.$x("//*[@id='__next']/div/div[1]/div/nav/div[2]/button");
            await paymentContinueButton.click();

            // find payNow button
            await page.waitForXPath("//button[contains(., 'Pay now')]")
            const [payNowButton] = await page.$x("//button[contains(., 'Pay now')]");

            if (payNowButton) {
              console.log("🎉'Pay now' button found and ready to click")
              await page.waitForTimeout(3000)
              if (IS_FOR_REAL) {
                await payNowButton.click();
                // massive log to make it easy to spot in the logs
                console.log('⏳ Trying to pay...')
                page.waitForTimeout(60000);
                const [confirmationMessage] = await page.$x("//h1[contains(., 'The tickets are now yours! Enjoy')]")
                if (confirmationMessage) {
                  console.log("🥳 It's official, I just bought a ticket \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 \n 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉")
                }
              }
              browser.close();
            }
          }
        }
      }
    }
  }
});