import { 
    APIGatewayProxyEvent, 
    APIGatewayProxyResult } 
from "aws-lambda/trigger/api-gateway-proxy";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { emailHTML } from './assets/mail-body';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Sensor } from './model/sensor';

const docClient = new DocumentClient();
const ses = new SESClient({ region: 'us-east-1' });

export const lambdaHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        let body = JSON.parse(event?.body || '{}');
        let item: Sensor = {
            device: body?.DevEUI_uplink?.DevEUI,
            datetime: (new Date(body?.DevEUI_uplink?.Time)).toISOString(),
            temperature: body?.DevEUI_uplink?.payload?.temperature,
            humidity: body?.DevEUI_uplink?.payload?.humidity,
            co2: body?.DevEUI_uplink?.payload?.co2,
            pressure: body?.DevEUI_uplink?.payload?.pressure
        };
        await docClient.put({
            TableName: 'IoTForestFiresDetection',
            Item: item
        }).promise();

        if(item?.co2 >= 4000 && item?.humidity <= 50 && item?.temperature >= 35){
            let html = ``
            const command = new SendEmailCommand({
                Destination: {
                  ToAddresses: ['ruthlechuga97@gmail.com'],
                  BccAddresses: []
                },
                Message: {
                  Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: emailHTML
                    }
                  },
                  Subject: { Data: "¡Alerta de Incendio!" }
                },
                Source: '3001450040101@ingenieria.usac.edu.gt'
            });
            await ses.send(command);
        }
    
        return {
            statusCode: 200,
            body: 'Item Insert'
        };
    } catch(error: any) {
        return {
            statusCode: 500,
            body: error?.message
        }
    }
}