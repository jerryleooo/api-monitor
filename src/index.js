/**
 *
 * monitor api
 * {
 *  type: http | ..., default http
 *  api: (for http) {
 *    options: {
 *      protocol, default 'http:'
 *      host, default 'localhost'
 *      port, default 80
 *      method, default 'GET'
 *      path, default '/',
 *      headers,
 *      auth,
 *      timeout, in milliseconds
 *    },
 *    data, default null
 *  },
 *  responseChecker,
 *  reporter,
 *  period: in milliseconds, default 2 * 60 * 1000
 * }
 */
const {
  checkApi
} = require('./checkApi');
const {
  info,
  infoErr,
  httpRequest
} = require('./util');
const {
  exec
} = require('child_process');

const monitorApi = (monitorObj) => {
  const monitorObjText = JSON.stringify(monitorObj);
  info('api-check', `start check ${monitorObjText}`);

  const keep = () => {
    setTimeout(() => {
      monitorApi(monitorObj);
    }, monitorObj.period);
  };
  // check api
  checkApi(monitorObj).then(() => {
    keep();
  }).catch((err) => {
    infoErr('api-error', `${err.message}, ${monitorObjText}`);
    (Array.isArray(monitorObj.reporter) ? monitorObj.reporter : monitorObj.reporter ? [monitorObj.reporter] : []).map(item => {
      report(item, err.message, monitorObj);
    });
    keep();
  });
};

const report = (reporter, errMsg, monitorObj) => {
  if (typeof reporter === 'function') {
    reporter(errMsg, monitorObj);
  } else if (reporter && typeof reporter === 'object') {
    if (reporter.type === 'http') {
      const reportInfo = reporter.cnt(errMsg, monitorObj);
      info('err-report', 'start to send report.');
      httpRequest(reportInfo).then((res) => {
        info('report-response', res); // eslint-disable-line
        info('err-report', 'report sent. response of report.');
      }).catch(err => {
        infoErr('report-fail', `${err.message}. ${JSON.stringify(reportInfo)}.`);
      });
    } else if (reporter.type === 'shell') {
      info('report-shell', `start to exec shell ${reporter.cnt}.`);
      exec(reporter.cnt, (error, stdout, stderr) => {
        if (error) {
          infoErr('report-fail', `exec error: ${error}`);
          return;
        }
        info('report-shell', `stdout: ${stdout}`);
        info('report-shell', `stderr: ${stderr}`);
      });
    }
  }
};

const monitorApis = ({
  apis
}) => {
  info('monitor', 'start');
  apis.map(monitorApi);
};

module.exports = {
  checkApi,
  monitorApi,
  monitorApis
};
