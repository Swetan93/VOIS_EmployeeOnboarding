export const handler = async () => {
  try {
    const requiredEnvVars = [
      "CLIENT_ID",
      "CLIENT_SECRET",
      "ACCOUNT",
      "TENANT",
      "FOLDER_ID",
      "QUEUE_NAME",
    ];
    
    for (const key of requiredEnvVars) {
      if (!process.env[key]) {
        throw new Error(`Missing environment variable: ${key}`);
      }
    }
    // 1️⃣ Fetch employees
    const response = await fetch(
      "https://dummy.restapiexample.com/api/v1/employees"
    );
    const data = await response.json();
    const employees = data.data;

    // 2️⃣ Get UiPath Access Token
    const tokenResponse = await fetch(
      "https://cloud.uipath.com/identity_/connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          scope: "OR.Queues",
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 3️⃣ Push each employee to Queue
    for (const employee of employees) {
      const salary = Number(employee.employee_salary);
      let priority = "Low";

      if (salary > 300000) priority = "High";
      else if (salary >= 100000) priority = "Normal";

      await fetch(
        `https://cloud.uipath.com/${process.env.ACCOUNT}/${process.env.TENANT}/odata/Queues/UiPathODataSvc.AddQueueItem`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-UIPATH-OrganizationUnitId": process.env.FOLDER_ID,
          },
          body: JSON.stringify({
            itemData: {
              Name: process.env.QUEUE_NAME,
              Priority: priority,
              Reference: `EMP-${employee.id}`,
              SpecificContent: {
                Employee_id: employee.id,
                EmployeeName: employee.employee_name,
                EmployeeSalary: salary,
                EmployeeAge: employee.employee_age
              },
            },
          }),
        }
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Data uploaded to Orchestrator queue" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};