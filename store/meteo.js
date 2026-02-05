const { getDatabase } = require('../database');

const getLiveWeatherData = async (dataParam) => {
  try {
    const db = getDatabase();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

   
    if (dataParam) {
      const requestedData = dataParam.split(',').map(d => d.trim());
      const invalidParams = requestedData.filter(param => !collectionNames.includes(param));
      
      if (invalidParams.length > 0) {
        const error = new Error('Paramètre invalide');
        error.invalidParams = invalidParams;
        error.status = 400;
        throw error;
      }
    }

    console.log('Collections disponibles:', collectionNames);

    if (!dataParam) {
      // Récupérer les données GPS les plus récentes d'abord
      let latestDate = new Date();
      let latestLocation = { lat: 0, long: 0 };
      let latestNmeaData = null;
      
      if (collectionNames.includes('nmea')) {
        const nmeaCollection = db.collection('nmea');
        const latestNmea = await nmeaCollection.findOne({}, { sort: { timestamp: -1 } });
        if (latestNmea) {
          latestDate = new Date(latestNmea.timestamp);
          latestLocation.lat = latestNmea.latitude;
          latestLocation.long = latestNmea.longitude;
          latestNmeaData = latestNmea;
        }
      }

      const result = {
        data: {
          date: latestDate.toISOString(),
          location: latestLocation,
          measurements: {}
        }
      };

      for (const collectionName of collectionNames) {
        if (collectionName !== 'nmea') {
          const collection = db.collection(collectionName);
          // Chercher sans la contrainte de date pour le debug
          const latestDoc = await collection.findOne({}, { sort: { date: -1 } });
          console.log(`Collection ${collectionName}:`, latestDoc ? 'trouvé' : 'non trouvé');
          if (latestDoc) {
            console.log(`Date du document: ${latestDoc.date}, Date de référence: ${latestDate}`);
            // Vérifier si le document est avant la date de référence
            if (new Date(latestDoc.date) <= latestDate) {
              if (collectionName === 'wind') {
                // Cas spécial pour wind: retourner toutes les valeurs
                result.data.measurements[collectionName] = {
                  speed_avg: {
                    unit: latestDoc.unit_speed || '',
                    value: latestDoc.speed_avg || 0
                  },
                  speed_max: {
                    unit: latestDoc.unit_speed || '',
                    value: latestDoc.speed_max || 0
                  },
                  speed_min: {
                    unit: latestDoc.unit_speed || '',
                    value: latestDoc.speed_min || 0
                  },
                  heading: {
                    unit: latestDoc.unit_heading || '',
                    value: latestDoc.heading || 0
                  }
                };
              } else {
                // Cas normal pour les autres collections
                result.data.measurements[collectionName] = {
                  unit: latestDoc.unit || '',
                  value: latestDoc.value || 0
                };
              }
            } else {
              console.log(`Document ${collectionName} est après la date de référence`);
            }
          }
        }
      }

      if (latestNmeaData) {
        result.data.measurements.nmea = {
          altitude: {
            unit: 'm',
            value: latestNmeaData.altitude_m
          },
          speed_knots: {
            unit: 'Kts',
            value: latestNmeaData.speed_knots
          },
          course_deg: {
            unit: '°',
            value: latestNmeaData.course_deg
          },
          fix_quality: {
            unit: '',
            value: latestNmeaData.fix_quality
          },
          num_satellites: {
            unit: '',
            value: latestNmeaData.num_satellites
          }
        };
      }

      console.log('Measurements finales:', result.data.measurements);

      return result;
    }

    const requestedData = dataParam.split(',').map(d => d.trim());
    
    // Récupérer les données GPS les plus récentes d'abord
    let latestDate = new Date();
    let latestLocation = { lat: 0, long: 0 };
    let latestNmeaData = null;
    
    if (collectionNames.includes('nmea')) {
      const nmeaCollection = db.collection('nmea');
      const latestNmea = await nmeaCollection.findOne({}, { sort: { timestamp: -1 } });
      if (latestNmea) {
        latestDate = new Date(latestNmea.timestamp);
        latestLocation.lat = latestNmea.latitude;
        latestLocation.long = latestNmea.longitude;
        latestNmeaData = latestNmea;
      }
    }

    const result = {
      data: {
        date: latestDate.toISOString(),
        location: latestLocation,
        measurements: {}
      }
    };

    for (const dataType of requestedData) {
      if (!collectionNames.includes(dataType)) {
        const error = new Error(`Paramètre invalide: ${dataType}`);
        error.status = 400;
        error.invalidParams = [dataType];
        throw error;
      }

      if (dataType === 'nmea') {
        // Cas spécial pour nmea: retourner toutes les valeurs sauf lat/long (déjà dans location)
        if (latestNmeaData) {
          result.data.measurements[dataType] = {
            altitude: {
              unit: 'm',
              value: latestNmeaData.altitude_m
            },
            speed_knots: {
              unit: 'Kts',
              value: latestNmeaData.speed_knots
            },
            course_deg: {
              unit: '°',
              value: latestNmeaData.course_deg
            },
            fix_quality: {
              unit: '',
              value: latestNmeaData.fix_quality
            },
            num_satellites: {
              unit: '',
              value: latestNmeaData.num_satellites
            }
          };
        }
        continue;
      }

      if (collectionNames.includes(dataType)) {
        const collection = db.collection(dataType);
        const latestDoc = await collection.findOne(
          { date: { $lte: latestDate.toISOString() } }, 
          { sort: { date: -1 } }
        );
        if (latestDoc) {
          if (dataType === 'wind') {
            // Cas spécial pour wind: retourner toutes les valeurs
            result.data.measurements[dataType] = {
              speed_avg: {
                unit: latestDoc.unit_speed || '',
                value: latestDoc.speed_avg || 0
              },
              speed_max: {
                unit: latestDoc.unit_speed || '',
                value: latestDoc.speed_max || 0
              },
              speed_min: {
                unit: latestDoc.unit_speed || '',
                value: latestDoc.speed_min || 0
              },
              heading: {
                unit: latestDoc.unit_heading || '',
                value: latestDoc.heading || 0
              }
            };
          } else {
            // Cas normal pour les autres collections
            result.data.measurements[dataType] = {
              unit: latestDoc.unit || '',
              value: latestDoc.value || 0
            };
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération des données live:', error);
    throw error;
  }
};

const getArchivedWeatherData = async (start, end) => {
  try {
    const db = getDatabase();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('Collections disponibles:', collectionNames);
    
    const startDate = new Date(start * 1000);
    const endDate = new Date(end * 1000);
    
    // Élargir la période pour être sûr d'inclure les données récentes
    startDate.setHours(startDate.getHours() - 24); // -24 heures
    endDate.setHours(endDate.getHours() + 1); // +1 heure
    
    console.log('Période recherchée:', startDate.toISOString(), 'à', endDate.toISOString());
    
    const result = {
      legend: ['time', 'lat', 'long'],
      unit: ['ISO8601', '°', '°'],
      data: []
    };

    let gpsData = [];
    if (collectionNames.includes('nmea')) {
      const nmeaCollection = db.collection('nmea');
      // Convertir les dates en format ISO string pour comparer avec timestamp
      gpsData = await nmeaCollection.find({
        timestamp: { 
          $gte: startDate.toISOString(), 
          $lte: endDate.toISOString() 
        }
      }).sort({ timestamp: 1 }).toArray();
      console.log('Données GPS trouvées:', gpsData.length);
    }

    const allTimestamps = new Set();
    if (gpsData.length > 0) {
      gpsData.forEach(p => allTimestamps.add(p.timestamp));
    }

    // Ordre souhaité par l'utilisateur
    const desiredOrder = ['temperature', 'humidity', 'pressure', 'nmea', 'luminosity', 'wind'];
    
    // On ne filtre plus 'nmea' car l'utilisateur le veut dans la liste
    const measureCollections = collectionNames;
    console.log('Collections disponibles pour mesures:', measureCollections);

    // Pré-charger les unités et vérifier l'existence des données pour chaque collection dans l'ordre désiré
    const activeCollections = [];
    for (const collectionName of desiredOrder) {
      if (!measureCollections.includes(collectionName)) continue;

      const timeField = collectionName === 'nmea' ? 'timestamp' : 'date';
      const collection = db.collection(collectionName);
      const query = {};
      query[timeField] = { 
        $gte: startDate.toISOString(), 
        $lte: new Date(endDate.getTime() + 60000).toISOString() 
      };

      const measureData = await collection.find(query, { limit: 1 }).toArray();

      if (measureData.length > 0) {
        activeCollections.push(collectionName);
        if (collectionName === 'wind') {
          result.legend.push('wind_speed_avg', 'wind_speed_max', 'wind_speed_min', 'wind_heading');
          const sample = await db.collection('wind').findOne();
          result.unit.push(
            sample?.unit_speed || 'Kts',
            sample?.unit_speed || 'Kts', 
            sample?.unit_speed || 'Kts',
            sample?.unit_heading || '°'
          );
        } else if (collectionName === 'nmea') {
          // Cas spécial pour nmea: ajouter toutes les sous-valeurs dans la légende
          result.legend.push('nmea_altitude', 'nmea_latitude', 'nmea_longitude', 'nmea_speed_knots', 'nmea_course_deg', 'nmea_fix_quality', 'nmea_num_satellites');
          result.unit.push('m', '°', '°', 'Kts', '°', '', '');
        } else {
          result.legend.push(collectionName);
          const sample = await db.collection(collectionName).findOne();
          result.unit.push(sample?.unit || '');
        }

        // Ajouter les timestamps de cette collection à la chronologie
        const allDocs = await db.collection(collectionName).find(query).toArray();
        allDocs.forEach(d => allTimestamps.add(d.date || d.timestamp));
      }
    }

    const sortedTimestamps = Array.from(allTimestamps).sort();
    console.log('Total timestamps uniques:', sortedTimestamps.length);

    for (const timestamp of sortedTimestamps) {
      let lat = null;
      let long = null;
      let nmeaValues = null;
      
      // Toujours chercher le NMEA le plus récent avant ce timestamp
      if (collectionNames.includes('nmea')) {
        const nmeaCollection = db.collection('nmea');
        const closestNmea = await nmeaCollection.findOne({
          timestamp: { $lte: timestamp }
        }, { sort: { timestamp: -1 } });
        
        if (closestNmea) {
          lat = closestNmea.latitude;
          long = closestNmea.longitude;
          nmeaValues = [
            closestNmea.altitude_m,
            closestNmea.latitude,
            closestNmea.longitude,
            closestNmea.speed_knots,
            closestNmea.course_deg,
            closestNmea.fix_quality,
            closestNmea.num_satellites
          ];
        }
      }

      const rowData = [timestamp, lat, long];

      for (const collectionName of activeCollections) {
        if (collectionName === 'nmea') {
          // Pour nmea, mettre toutes les valeurs dans un tableau
          rowData.push(nmeaValues || [null, null, null, 0, 0, 0, 0]);
          continue;
        }

        const collection = db.collection(collectionName);
        const closestMeasure = await collection.findOne({
          date: { $lte: timestamp }
        }, { sort: { date: -1 } });

        if (closestMeasure) {
          if (collectionName === 'wind') {
            // Pour wind, mettre toutes les valeurs dans un tableau
            rowData.push([
              closestMeasure.speed_avg || 0,
              closestMeasure.speed_max || 0,
              closestMeasure.speed_min || 0,
              closestMeasure.heading || 0
            ]);
          } else {
            rowData.push(closestMeasure.value || 0);
          }
        } else {
          if (collectionName === 'wind') {
            // Pour wind, ajouter un tableau de valeurs null
            rowData.push([null, null, null, null]);
          } else {
            rowData.push(null);
          }
        }
      }
      result.data.push(rowData);
    }

    console.log('Données finales:', result.data.length, 'lignes');
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération des données archivées:', error);
    throw error;
  }
};

module.exports = {
  getLiveWeatherData,
  getArchivedWeatherData
};
