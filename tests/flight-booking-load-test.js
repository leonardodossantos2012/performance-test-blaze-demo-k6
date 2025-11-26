import http from 'k6/http';
import { check, sleep } from 'k6';
import { purchaseSuccessRate } from '../services/metrics.js';
import { generatePassengerData, getRandomCities } from '../services/data-generator.js';
import { extractFlightInfo, buildReserveUrl } from '../services/flight-service.js';
import { handleSummary } from '../services/reporter.js';

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { target: 100, duration: '1m' },
        { target: 150, duration: '30s' },
        { target: 200, duration: '30s' },
        { target: 250, duration: '1m' },
        { target: 250, duration: '3m' },
        { target: 150, duration: '1m' },
        { target: 50, duration: '1m' },
        { target: 0, duration: '30s' },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(90)<2000'],
    http_req_failed: ['rate<0.01'],
    purchase_success: ['rate>0.95'],
    http_reqs: ['rate>=240'],
  },
};

export default function () {
  const baseUrl = 'https://www.blazedemo.com';
  let purchaseSuccess = false;

  let res = http.get(baseUrl);
  check(res, {
    'homepage status is 200': (r) => r.status === 200,
  });

  const cities = getRandomCities();
  const reserveUrl = buildReserveUrl(baseUrl, cities.fromPort, cities.toPort);

  res = http.get(reserveUrl);
  const reserveCheck = check(res, {
    'reserve status is 200': (r) => r.status === 200,
    'reserve page contains flights': (r) => r.body.includes('Choose') || r.body.includes('flight'),
  });

  if (!reserveCheck) {
    purchaseSuccessRate.add(0);
    return;
  }

  const flightInfo = extractFlightInfo(res.body);

  const purchaseParams = {
    flight: flightInfo.flight,
    price: flightInfo.price,
  };

  res = http.post(`${baseUrl}/purchase.php`, purchaseParams);
  const purchaseCheck = check(res, {
    'purchase status is 200': (r) => r.status === 200,
    'purchase page loaded': (r) => r.body.includes('Your flight') || r.body.includes('Total Cost'),
  });

  if (!purchaseCheck) {
    purchaseSuccessRate.add(0);
    return;
  }

  const passengerData = generatePassengerData();
  const confirmationParams = {
    inputName: passengerData.inputName,
    address: passengerData.address,
    city: passengerData.city,
    state: passengerData.state,
    zipCode: passengerData.zipCode,
    cardType: passengerData.cardType,
    creditCardNumber: passengerData.creditCardNumber,
    creditCardMonth: passengerData.creditCardMonth,
    creditCardYear: passengerData.creditCardYear,
    nameOnCard: passengerData.nameOnCard,
  };

  res = http.post(`${baseUrl}/confirmation.php`, confirmationParams);
  const confirmationCheck = check(res, {
    'confirmation status is 200': (r) => r.status === 200,
    'purchase confirmed': (r) => r.body.includes('Thank you') || r.body.includes('confirmation') || r.body.includes('Id'),
  });

  if (confirmationCheck) {
    purchaseSuccess = true;
  }

  purchaseSuccessRate.add(purchaseSuccess);

  sleep(0.5);
}

export { handleSummary };

