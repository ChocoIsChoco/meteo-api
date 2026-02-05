# API

## Vocab

wind_heading -> degré

wind_speed_avg
wind_speed_min
wind-speed-max
-> Kts


temperature -> °C
humidity -> powertage
pressure -> hP
rain -> N/A



## Endpoint for Live

/meteo/v1/live/?data={}

### Exemple
/meteo/v1/live/?data={temperature, hygrometry...}

### Return
```
{
    "data": {
    "date":  ,
    "location": {
    "lat": ,
    "long": 
    },
    "measurments": {
    "temperature":{
    "unit": ,
    "value"
    }
    
    }
    
    }
}
```

## Endpoint for Archive

/meteo/v1/archive/?start=timestam1&end=timestamp2



### Return
```
{
    "legend": ["time","lat","long"],
    "unit":["","",""],
    "data":[
        ["",""],
        ["",""]
    ]


    
}
```


## For Errors
```
{
    "error_code": ,
    "error_message": 
}
```


j'ai mis aussi nodemon pour le suivi de mon seurveur
https://aprs.gids.nl/nmea/#gga
https://gist.github.com/gbzarelli/c15b607d62fc98ae436564bf8129ea8e

docs MDN javascript
https://stackoverflow.com/questions/983291/purpose-of-x20-x7e-in-regular-expressions



https://docs.docker.com/build/building/variables/#env-usage-example
https://blog.stephane-robert.info/docs/conteneurs/moteurs-conteneurs/docker/secrets/
le mot de passe pour les raspberry est : ensg

pi@piensg027


quand je me suis mis sur le raspberry, j'ai cloné mon depot git dessus et après j'ai crée mes
fichiers dans le dossier secrets pour les secrets puisqu'ils ne sont pas mis sur git
après j'ai fait sudo cp -a /home/pi/meteoapi /opt/meteoapi et j'ai fait aussi 
sudo cp meteo-api/meteoapi.service /etc/systemd/system/

et j'ai fait :
sudo systemctl enable meteoapi
sudo systemctl start meteoapi

la version de mongo qui est disponible sur raspberry est : mongo:4.4.18
Il faut la version 5 des raspberry pour que les nouvelles versions des images docker fonctionnent dessus


il faut faire docker compose down -v pour supprimer tous les volumes pour éviter les conflits entre les fichiers des differentes versions de mongo que j'ai monté le volume avec 
mon docker compose