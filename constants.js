export const EVENT_URL = "https://www.ticketswap.com/event/caracole-festival-2021/regular-tickets/341d0129-b70e-46c5-812f-74f671b8f85d/1687142"; 
// replace by your event's ticketswap .com url
// ⚠️ .com is mandatory here because the english texts are used to target some elements

export const IS_FOR_REAL = false; // replace by true if you want the bot to actually buy the ticket in the last step of payment
export const MINIMUM_PRICE = 0; // sometimes, an event's page also offers things such as bus tickets for the event, which will be bellow the price of a real ticket, enter a realistic minimum price for an actual ticket here

export const puppeteerConfig = {
  headless: false, // replace by false if you want to watch the bot at work
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // replace by your Google Chrome path
  userDataDir: '/Users/admin/Library/Application\ Support/Google/Chrome', // replace by your Chrome userDataDir path (probably just need to replace 'admin' by your username here)
  args: [
    // those are required to bypass the security on Stripe's payment form
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process'
  ]
}

// replace by your actual payment credentials below if you wish to make a real purchase
export const CREDIT_CARD_NUMBER = '4111111111111111';
export const EXPIRATION_DATE = '0625';
export const CVC = '999';
export const CARDHOLDER_NAME = 'John Doe';