// =====================================
// NOVA-FOREST AI
// Dashboard Controller
// =====================================

async function loadDashboard() {

    try {

        const response = await fetch(
            "http://localhost:8000/risk-analysis"
        );

        if (!response.ok) {
            throw new Error("Risk API bağlantısı başarısız.");
        }

        const data = await response.json();

        console.log("Nova-Forest AI Risk Data:", data);

        const regions = data.regions || [];

        // Bölge sayısı
        const regionCard = document.querySelectorAll(".card")[1];

        if (regionCard) {

            const value = regionCard.querySelector("strong");

            if (value) {
                value.textContent = regions.length;
            }

        }


        // Genel risk skorunu hesapla
        const validRegions = regions.filter(
            region =>
                region.analysis &&
                typeof region.analysis.risk_score === "number"
        );


        if (validRegions.length > 0) {

            const total = validRegions.reduce(
                (sum, region) =>
                    sum + region.analysis.risk_score,
                0
            );

            const average =
                Math.round(total / validRegions.length);


            const riskCard =
                document.querySelectorAll(".card")[0];

            if (riskCard) {

                const value =
                    riskCard.querySelector("strong");

                const description =
                    riskCard.querySelector("p");


                if (value) {
                    value.textContent =
                        average + "/100";
                }


                if (description) {

                    description.textContent =
                        getRiskLabel(average);

                }

            }

        }


        // Veri kaynağı kartı
        const sourceCard =
            document.querySelectorAll(".card")[2];

        if (sourceCard) {

            const value =
                sourceCard.querySelector("strong");

            if (value) {
                value.textContent = "LIVE";
            }

        }


        // Konsola bölge analizlerini yaz
        regions.forEach(region => {

            if (region.analysis) {

                console.log(
                    region.region,
                    region.analysis.risk_score,
                    region.analysis.risk_level
                );

            }

        });

    }

    catch (error) {

        console.error(
            "Nova-Forest AI Dashboard Error:",
            error
        );

    }

}



function getRiskLabel(score) {

    if (score < 25) {
        return "Düşük Risk";
    }

    if (score < 50) {
        return "Orta Risk";
    }

    if (score < 75) {
        return "Yüksek Risk";
    }

    return "Kritik Risk";

}



loadDashboard();
