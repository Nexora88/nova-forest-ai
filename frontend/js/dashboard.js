// Nova-Forest AI Dashboard Module


const projectName = "Nova-Forest AI";


function loadDashboard() {

    console.log(projectName + " dashboard loaded");


    const areas = [
        "Edirne",
        "Kırklareli",
        "Tekirdağ",
        "Çanakkale",
        "İstanbul Avrupa Yakası"
    ];


    areas.forEach(area => {

        console.log("Monitoring area:", area);

    });

}


loadDashboard();
