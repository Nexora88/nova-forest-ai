// Nova-Forest AI Dashboard Module


function getRiskEmoji(level) {

    if (level === "LOW") {
        return "🟢";
    }

    if (level === "MEDIUM") {
        return "🟡";
    }

    if (level === "HIGH") {
        return "🟠";
    }

    if (level === "CRITICAL") {
        return "🔴";
    }

    return "⚪";
}



function loadDashboard() {


    fetch("http://localhost:8000/regions")


        .then(response => response.json())


        .then(data => {


            const dashboard =
                document.getElementById("dashboard");


            const container =
                document.createElement("div");


            container.id = "risk-container";


            dashboard.appendChild(container);



            data.forEach(region => {


                const box =
                    document.createElement("div");


                box.className = "risk-box";


                box.innerHTML = `

                <h3>
                ${getRiskEmoji(region.risk)}
                ${region.name}
                </h3>

                <p>
                Risk Seviyesi:
                ${region.risk}
                </p>

                <p>
                Sistem:
                Aktif İzleme
                </p>

                `;


                container.appendChild(box);


            });


        })


        .catch(error => {

            console.log(
                "Dashboard error:",
                error
            );

        });


}



loadDashboard();
