// Import dependencies
require('dotenv').config();
const axios = require('axios');
const sgMail = require('@sendgrid/mail');

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
    try {
        const response = await axios.post(
            'https://api.monday.com/v2',
            { query: query },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': process.env.MONDAY_API_KEY,
                    'API-version': '2023-10'
                },
                timeout: 10000 // 10 seconds timeout
            }
        );
        return response.data.data.boards[0].items_page.items;
    } catch (error) {
        console.error('Error fetching data from Monday.com:', error);
        throw error;
    }
};

// Function to process data
const processMondayData = (items) => {
    return items.map(item => {
        const name = item.column_values.find(col => col.id === 'text__1').value.replace(/"/g, '');
        const emailData = JSON.parse(item.column_values.find(col => col.id === 'email__1').value);
        const email = emailData.email;
        const emailContent = item.column_values.find(col => col.id === 'text_1__1').value.replace(/"/g, '');

        return {
            name,
            email,
            email_content: emailContent
        };
    });
};

// Function to send emails using SendGrid
const sendEmails = async (recipients) => {
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
            console.error(`Error sending email to ${person.name} (${person.email}):`, error);
        }
    }
};

// Main function to orchestrate fetching data and sending emails
const main = async () => {
    try {
        const items = await fetchMondayData();
        const recipients = processMondayData(items);
        await sendEmails(recipients);
    } catch (error) {
        console.error('Error in main function:', error);
    } finally {
        process.exit(0); // Ensure the script exits after completion
    }
};

// Run the main function
main();
