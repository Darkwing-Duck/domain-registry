import url from "url";
import * as eth from "./eth.js";

export function handleMint(req, res) {
  let requestBody = '';

  req.on('data', (chunk) => {
    requestBody += chunk.toString();
  });

  req.on('end', async () => {
    res.setHeader('Content-Type', 'text/plain');
    try {
      const { to, amount } = JSON.parse(requestBody);
      await eth.mint(to, amount);
      res.statusCode = 200;
      res.end(`Minted ${amount} tokens to ${to}.\n`);
    } catch (error) {
      res.statusCode = 500;
      res.end(`Internal Server Error:${error.message}\n`);
    }
  });
}

export function handleWithdrawEth(res, req) {
  let requestBody = '';

  req.on('data', (chunk) => {
    requestBody += chunk.toString();
  });

  req.on('end', async () => {
    
    console.log("requestBody - ", requestBody)
    res.setHeader('Content-Type', 'text/plain');
    try {
      const { to } = JSON.parse(requestBody);
      await eth.withdrawEth(to);
      res.statusCode = 200;
      res.end(`All ETH withdrawed to address "${to}".\n`);
    } catch (error) {
      res.statusCode = 500;
      res.end(`Internal Server Error:${error.message}\n`);
    }
  });
}

export function handleWithdrawUsd(res, req) {
  let requestBody = '';

  req.on('data', (chunk) => {
    requestBody += chunk.toString();
  });

  req.on('end', async () => {
    res.setHeader('Content-Type', 'text/plain');
    try {
      const { to, amount } = JSON.parse(requestBody);
      await eth.withdrawUsd(to);
      res.statusCode = 200;
      res.end(`All USD withdrawed to address "${to}".\n`);
    } catch (error) {
      res.statusCode = 500;
      res.end(`Internal Server Error:${error.message}\n`);
    }
  });
}

export async function handleRegistrationPrice(res, req) {
  res.setHeader('Content-Type', 'text/plain');

  try {
    const parsedUrl = url.parse(req.url, true);
    // const queryParameters = parsedUrl.query;
    // const address = queryParameters.address;
    const price = await eth.registrationPrice();
    res.statusCode = 200;
    res.end(`Registration price is ${price} usd\n`);
  } catch (error) {
    res.statusCode = 500;
    res.end(`Internal Server Error:${error.message}\n`);
  }
}

export async function handleReward(res, req) {
  res.setHeader('Content-Type', 'text/plain');

  try {
    const reward = await eth.reward();
    res.statusCode = 200;
    res.end(`Registration price is ${reward} usd\n`);
  } catch (error) {
    res.statusCode = 500;
    res.end(`Internal Server Error:${error.message}\n`);
  }
}

