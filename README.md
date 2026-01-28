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





