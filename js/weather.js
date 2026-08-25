// =====================================
// NOVA-FOREST AI
// Weather Data Controller
// =====================================

async function loadWeatherData() {

    try {

        const response = await fetch(
            "http://localhost:8000/risk-analysis"
        );

        if (!response.ok) {
            throw new Error("Weather API bağlantısı başarısız.");
        }

        const data = await response.json();

        console.log(
            "Nova-Forest AI Weather Data:",
            data
        );

        const regions = data.regions || [];

        if (regions.length === 0) {
            return;
        }

        // İlk bölgenin verilerini
        // genel atmosfer panelinde göster
        const region = regions[0];

        if (!region.weather) {
            return;
        }

        const weather = region.weather;

        const cards =
            document.querySelectorAll(".card");

        // Sıcaklık
        if (cards[0]) {

            const value =
                cards[0].querySelector("strong");

            const description =
                cards[0].querySelector("p");

            if (value) {
                value.textContent =
                    `${weather.temperature} °C`;
            }

            if (description) {
                description.textContent =
                    `${region.region} güncel sıcaklık`;
            }
        }


        // Nem
        if (cards[1]) {

            const value =
                cards[1].querySelector("strong");

            if (value) {
                value.textContent =
                    `${weather.humidity} %`;
            }
        }


        // Rüzgar
        if (cards[2]) {

            const value =
                cards[2].querySelector("strong");

            if (value) {
                value.textContent =
                    `${weather.wind} km/h`;
            }
        }


        // AI durumu
        if (cards[3]) {

            const value =
                cards[3].querySelector("strong");

            if (value) {
                value.textContent = "ONLINE";
            }
        }

    }

    catch (error) {

        console.error(
            "Nova-Forest AI Weather Error:",
            error
        );

    }

}


loadWeatherData();
