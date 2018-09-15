
var userCapture = require("../app/controllers/userCaptureController.js");
var UserKey = require('../app/models/userKey');

module.exports = function (cron) {
 
  let autocaptureJob = new cron.CronJob({

  //  cronTime : '* */10 * * * *',  // The time pattern when you want the job to start
  cronTime : '00 */30 * * * *', // at 30 min of hour and on the hour
  //cronTime : '00 45 17 * * 0-7',
    onTick : userCapture.autoCapturePortfolio, // Task to run
   // onComplete : resetNumber, // When job is completed and It stops.
    start : true, // immediately starts the job.
    //timeZone : config.timeZone // The timezone
    timeZone: 'Europe/London'
  });
 
  return autocaptureJob;

  
};