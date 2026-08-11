# =====================================
# NOVA-FOREST AI
# Main Application
# =====================================


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware



from app.api.routes import router as region_router

from app.api.weather_routes import router as weather_router

from app.api.satellite_routes import router as satellite_router

from app.api.ndvi_routes import router as ndvi_router

from app.api.advanced_risk_routes import router as risk_router





app = FastAPI(


    title="Nova-Forest AI",


    description=
    "Uydu tabanlı erken yangın risk analiz sistemi",


    version="0.1.0"


)






# Frontend bağlantısı

app.add_middleware(


    CORSMiddleware,


    allow_origins=[

        "*"

    ],


    allow_credentials=True,


    allow_methods=[

        "*"

    ],


    allow_headers=[

        "*"

    ]

)







# API bağlantıları


app.include_router(

    region_router

)



app.include_router(

    weather_router

)



app.include_router(

    satellite_router

)



app.include_router(

    ndvi_router

)



app.include_router(

    risk_router

)







@app.get("/")

def home():


    return {


        "system":

        "Nova-Forest AI",


        "status":

        "online",


        "version":

        "0.1.0"


    }







@app.get("/health")

def health():


    return {


        "status":

        "healthy",


        "system":

        "Nova-Forest AI"


    }
