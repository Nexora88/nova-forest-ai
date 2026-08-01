// Nova-Forest AI Dashboard Module


function loadDashboard() {


    fetch("http://localhost:8000/regions")


        .then(response => response.json())


        .then(data => {


            console.log(
                "Nova-Forest AI data loaded:",
                data
            );


            const dashboard =
                document.getElementById("dashboard");


            data.forEach(region => {


                const box =
                    document.createElement("div");


                box.className = "risk-box";


                box.innerHTML = `

                    <h3>${region.name}</h3>

                    <p>
                    Risk Seviyesi:
                    ${region.risk}
                    </p>

                `;


                dashboard.appendChild(box);


            });


        })


        .catch(error => {

            console.log(
                "Dashboard connection error:",
                error
            );

        });


}


loadDashboard();
