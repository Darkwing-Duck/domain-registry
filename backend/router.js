import url from 'url';
import {handleRegistrationPrice, handleReward, handleWithdrawEth, handleWithdrawUsd} from "./handlers.js";

async function routeRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  if (req.method === 'POST' && parsedUrl.pathname === '/withdrawEth') {
    await handleWithdrawEth(res, req);
  } else if (req.method === 'POST' && parsedUrl.pathname === '/withdrawUsd') {
    await handleWithdrawUsd(res, req);
  } else if (req.method === 'GET' && parsedUrl.pathname === '/registrationPrice') {
    await handleRegistrationPrice(res, req);
  } else if (req.method === 'GET' && parsedUrl.pathname === '/reward') {
    await handleReward(res, req);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found\n');
  }
}

export { routeRequest };
