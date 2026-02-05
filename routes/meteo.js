var express = require('express');
var router = express.Router();
const { getLiveWeatherData, getArchivedWeatherData } = require('../store/meteo');

/* GET live weather data */
router.get('/live', async function(req, res, next) {
  try {
    const dataParam = req.query.data;
    const result = await getLiveWeatherData(dataParam);
    res.json(result);
  } catch (error) {
    if (error.status === 400) {
      res.status(400).json({
        error_code: 400,
        error_message: `Paramètre invalide: ${error.invalidParams.join(', ')}`
      });
    } else {
      res.status(500).json({
        error_code: 500,
        error_message: 'Internal server error'
      });
    }
  }
});

/* GET archived weather data */
router.get('/archive', async function(req, res, next) {
  try {
    const start = req.query.start;
    const end = req.query.end;
    
    if (!start || !end) {
      return res.status(400).json({
        error_code: 400,
        error_message: 'Missing required parameters: start and end'
      });
    }
    
    const result = await getArchivedWeatherData(parseInt(start), parseInt(end));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error_code: 500,
      error_message: 'Internal server error'
    });
  }
});

module.exports = router;
