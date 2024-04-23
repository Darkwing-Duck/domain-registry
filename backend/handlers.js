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

export async function handleBalanceOf(res, req) {
  res.setHeader('Content-Type', 'text/plain');

  try {
    const parsedUrl = url.parse(req.url, true);
    const queryParameters = parsedUrl.query;
    const address = queryParameters.address;
    const balance = await eth.balanceOf(address);
    res.statusCode = 200;
    res.end(`Balance of ${address}: ${balance}\n`);
  } catch (error) {
    res.statusCode = 500;
    res.end(`Internal Server Error:${error.message}\n`);
  }
}
