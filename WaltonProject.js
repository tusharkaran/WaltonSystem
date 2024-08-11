// Import dependencies
require('dotenv').config();
const axios = require('axios');
const sgMail = require('@sendgrid/mail');

// Log environment variables (for debugging, avoid in production)
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'Set' : 'Not Set');
console.log('MONDAY_API_KEY:', process.env.MONDAY_API_KEY ? 'Set' : 'Not Set');
console.log('BOARD_ID:', process.env.BOARD_ID);
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

// Set your SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Define the Monday.com GraphQL query
const query = `
query {
  boards (ids: ${process.env.BOARD_ID}) {
    items_page {
      items {
       column_values {
       id
       value
      }
      }
    }
  }
}
`;

// Function to fetch data from Monday.com
const fetchMondayData = async () => {
    console.log('Fetching data from Monday.com...');
    try {
        const response = await axios.post(
            'https://api.monday.com/v2',
            { query: query },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': process.env.MONDAY_API_KEY,
                    'API-version': '2023-10'
                }
            }
        );
        console.log('Data fetched successfully:', response.data);
        return response.data.data.boards[0].items_page.items;
    } catch (error) {
        console.error('Error fetching data from Monday.com:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// Function to process data
const processMondayData = (items) => {
    console.log('Processing Monday.com data...');
    return items.map(item => {
        const name = item.column_values.find(col => col.id === 'text__1').value.replace(/"/g, '');
        const emailData = JSON.parse(item.column_values.find(col => col.id === 'email__1').value);
        const email = emailData.email;
        const emailContent = item.column_values.find(col => col.id === 'text_1__1').value.replace(/"/g, '');

        console.log(`Processed recipient: ${name}, email: ${email}`);

        return {
            name,
            email,
            email_content: emailContent
        };
    });
};

// Function to send emails using SendGrid
const sendEmails = async (recipients) => {
    console.log('Sending emails...');
    for (const person of recipients) {
        const msg = {
            to: person.email,
            from: process.env.EMAIL_FROM,
            subject: `Message for ${person.name}`,
            text: person.email_content,
            html: `<strong>${person.email_content}</strong>`,
        };

        try {
            await sgMail.send(msg);
            console.log(`Email sent to ${person.name} (${person.email})`);
        } catch (error) {
            console.error(`Error sending email to ${person.name} (${person.email}):`, error.response ? error.response.body : error.message);
        }
    }
};

// Main function to orchestrate fetching data and sending emails
const main = async () => {
    console.log('Starting main function...');
    try {
        const items = await fetchMondayData();
        const recipients = processMondayData(items);
        await sendEmails(recipients);
    } catch (error) {
        console.error('Error in main function:', error);
    }
    console.log('Main function execution completed.');
};

// Run the main function
main();
