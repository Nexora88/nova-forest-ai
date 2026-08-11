# =====================================
# NOVA-FOREST AI
# Open-Meteo Weather Service
# =====================================

import requests



OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"



def get_weather_data(latitude, longitude):


    params = {

        "latitude": latitude,

        "longitude": longitude,

        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "wind_speed_10m"
        ],

        "timezone": "Europe/Istanbul"

    }



    try:


        response = requests.get(
            OPEN_METEO_URL,
            params=params,
            timeout=10
        )


        data = response.json()



        current = data.get(
            "current",
            {}
        )



        return {


            "temperature":
            current.get(
                "temperature_2m"
            ),



            "humidity":
            current.get(
                "relative_humidity_2m"
            ),



            "wind":
            current.get(
                "wind_speed_10m"
            ),



            "source":
            "Open-Meteo"

        }



    except Exception as error:


        return {


            "error":
            str(error),


            "source":
            "Open-Meteo"

        }





def get_region_weather():



    regions = {


        "Edirne": {

            "lat":41.6771,

            "lng":26.5557

        },


        "Kırklareli": {

            "lat":41.7355,

            "lng":27.2252

        },


        "Tekirdağ": {

            "lat":40.9781,

            "lng":27.5110

        },


        "Çanakkale": {

            "lat":40.1553,

            "lng":26.4142

        },


        "Istanbul Avrupa": {

            "lat":41.1500,

            "lng":28.6500

        }


    }



    results = {}



    for name, location in regions.items():


        results[name] = get_weather_data(

            location["lat"],

            location["lng"]

        )



    return results
