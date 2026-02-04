const fs = require('node:fs')
const path = require('path');
const { getDatabase } = require('../database');

function nmeaLatToDecimal(nmeaLat, hemisphere) {
  const degrees = parseInt(nmeaLat.slice(0, 2), 10);
  const minutes = parseFloat(nmeaLat.slice(2));
  let decimal = degrees + minutes / 60;
  if (hemisphere === 'S') decimal = -decimal;
  return decimal;
}

function nmeaLonToDecimal(nmeaLon, hemisphere) {
  const degrees = parseInt(nmeaLon.slice(0, 3), 10);
  const minutes = parseFloat(nmeaLon.slice(3));
  let decimal = degrees + minutes / 60;
  if (hemisphere === 'W') decimal = -decimal;
  return decimal;
}

function nmeaToISO8601(nmeaTime, nmeaDate) {
  const hh = parseInt(nmeaTime.slice(0, 2), 10);
  const mm = parseInt(nmeaTime.slice(2, 4), 10);
  const ssFloat = parseFloat(nmeaTime.slice(4));
  const ss = Math.floor(ssFloat);
  const ms = Math.round((ssFloat - ss) * 1000);

  const day = parseInt(nmeaDate.slice(0, 2), 10);
  const month = parseInt(nmeaDate.slice(2, 4), 10);
  const year = 2000 + parseInt(nmeaDate.slice(4, 6), 10);

  const d = new Date(Date.UTC(year, month, day, hh, mm, ss, ms));
  return d.toISOString();
}


const readFileGpsNmea = async (filename) => {
  try {
    const response = fs.readFileSync(filename, 'utf8');
    const lines = response.split('\n').filter(line => line.trim() !== '');

    let ggaData = null;
    let rmcData = null;

    lines.forEach((line) => {
      const parts = line.split(',');

      if (line.startsWith('$GPGGA')) {
        ggaData = {
          time: parts[1],
          lat: parts[2],
          latHem: parts[3],
          lon: parts[4],
          lonHem: parts[5],
          fix_quality: parseInt(parts[6], 10),
          num_satellites: parseInt(parts[7], 10),
          hdop: parseFloat(parts[8]),
          altitude_m: parseFloat(parts[9]),
          geoid_height_m: parseFloat(parts[11])
        };
      } else if (line.startsWith('$GPRMC')) {
        rmcData = {
          time: parts[1],
          status: parts[2],
          lat: parts[3],
          latHem: parts[4],
          lon: parts[5],
          lonHem: parts[6],
          speed_knots: parseFloat(parts[7]),
          course_deg: parseFloat(parts[8]),
          date: parts[9],
          magVar_deg: parseFloat(parts[10])
        };
      }
    });

    if (ggaData && rmcData) {
      const nmea = {
        timestamp: nmeaToISO8601(ggaData.time, rmcData.date),
        latitude: nmeaLatToDecimal(ggaData.lat, ggaData.latHem),
        longitude: nmeaLonToDecimal(ggaData.lon, ggaData.lonHem),
        fix_quality: ggaData.fix_quality,
        num_satellites: ggaData.num_satellites,
        hdop: ggaData.hdop,
        altitude_m: ggaData.altitude_m,
        geoid_height_m: ggaData.geoid_height_m,
        status: rmcData.status,
        speed_knots: rmcData.speed_knots,
        course_deg: rmcData.course_deg,
        magnetic_variation_deg: rmcData.magVar_deg
      };

      return nmea;
    } else {
      throw new Error('Trames GGA ou RMC manquantes dans le fichier NMEA');
    }

  } catch (error) {
    console.error('Erreur lecture fichier GPS:', error);
    throw error;
  }
}

const saveNmeaToDb = async  (nmeaData) => {
  try {
    const db = getDatabase();
    const collection = db.collection('nmea');
    const result = await collection.insertOne(nmeaData);
    console.log('Document NMEA sauvegardé avec ID:', result.insertedId);
    return result;
  } catch (dbError) {
    console.error('Erreur de sauvegarde MongoDB:', dbError);
    throw dbError;
  }
}

module.exports = { 
  readFileGpsNmea,
  saveNmeaToDb 
};
