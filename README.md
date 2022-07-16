# Ticketswoop

Ticketswoop is a puppeteer-based bot to buy tickets on ticketswap when they are too difficult to buy by only relying on availability alerts.

## Installation

### Make sure you have node installed

```bash
node --version
```

And visit [this page](https://nodejs.org/en/download/package-manager/) if you don't.

---
### Clone the project
```bash
git clone https://github.com/MilanBarande/ticketswoop.git && cd ticketswoop
```

### Install the project

```bash
npm install
```

*OR*

```bash
yarn
```


## Usage

### To test the script

1. Open the `constants.js` file and replace the values for `EVENT_URL`, `MINIMUM_PRICE`, `executablePath` and `userDataDir`.
2. Enter your payment credentials with the `CREDIT_CARD_NUMBER`, `EXPIRATION_DATE`, `CVC` and `CARDHOLDER_NAME` variables if you wish to make an actual purchase.
3. Open Google Chrome and login to your Facebook account. If asked, tell Facebook to remember this browser.
4. Quit Chrome entirely
5. In the puppeteerConfig variable, change the `headless` value to `false` in order to see if the bot is working. You may want to use an event for which there are tickets available to see it reach the final step of payment. The bot will not make an actual purchase as long as you havent set the constant `IS_FOR_REAL` to `true`.
6. Launch the bot with the following command
```bash
node script.js
```
7. If the bot reaches the last payment with your test ticket, you can now replace the `EVENT_URL` with the desired event and set the `IS_FOR_REAL` variable to `true`.
8. You can now setup a [crontab](https://crontab.guru/) to have the bot run every minute (for example).
