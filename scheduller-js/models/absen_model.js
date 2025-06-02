const { formatDuration, formatTime } = require('../helpers/time_helper');
require('dotenv').config();

const USERNAME = 'Andrian.Kurnia@steradian.co.id';
const PASSWORD = process.env.PASSWORD;
const URL = process.env.URL;

function getNowJakarta() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
  );
}

function randomTimeBetween7_10To7_20() {
  const now = getNowJakarta();

  const targetHour = 7;
  const baseMinute = 10; 

  const maxDelaySeconds = 10 * 60 + 59; 

  const start = new Date(now);
  start.setHours(targetHour, baseMinute, 0, 0);

  
  if (start <= now) {
    start.setDate(start.getDate() + 1);
  }

  
  const randomDelayMs = Math.floor(Math.random() * (maxDelaySeconds + 1) * 1000); // Corrected to include the full range up to :59.999

  const scheduledTime = new Date(start.getTime() + randomDelayMs);
  const delayMs = scheduledTime.getTime() - now.getTime();

  return { delayMs, scheduledTime };
}





function waitUntilTomorrowAt7AM() {
  const now = getNowJakarta();
  const scheduledTime = new Date(now);
  scheduledTime.setDate(now.getDate() + 1);
  scheduledTime.setHours(7, 0, 0, 0);

  const delay = scheduledTime.getTime() - now.getTime();
  return { delay, scheduledTime };
}

function getUserCredentials() {
  return { USERNAME, PASSWORD, URL };
}

module.exports = {
  getNowJakarta,
  randomTimeBetween7_10To7_20,
  waitUntilTomorrowAt7AM,
  getUserCredentials,
};
