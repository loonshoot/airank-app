// src/pages/api/workspace/index.js
import slugify from 'slugify';
import {
  validateCreateWorkspace,
  validateSession,
} from '@/config/api-validation/index';
import { createWorkspace } from '@/prisma/services/workspace';
var chargebee = require("chargebee");

// Make the API call to Chargebee to create a customer
const chargebeeApiUrl = process.env.CHARGEBEE_API_URL; // Replace with your environment variable
const chargebeeApiSite = process.env.CHARGEBEE_API_SITE; // Replace with your environment variable
const chargebeeApiKey = process.env.CHARGEBEE_API_FULL_ACCESS; // Replace with your environment variable

chargebee.configure({site : chargebeeApiSite,
  api_key : chargebeeApiKey})

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'POST') {
      const session = await validateSession(req, res);
      await validateCreateWorkspace(req, res);
      const { name } = req.body;

      const chargebeeCustomerData = await setupChargebeeCustomer(session);
      
      if (!chargebeeCustomerData || !chargebeeCustomerData.customer || !chargebeeCustomerData.customer.id) {
          return res.status(500).json({ errors: { error: { msg: 'Chargebee customer ID not available' } } });
      }

      const chargebeeCustomerId = chargebeeCustomerData.customer.id;

      // Check if chargebeeCustomerId is available before calling setupChargebeeSubscription
      if (!chargebeeCustomerId) {
          return res.status(500).json({ errors: { error: { msg: 'Chargebee customer ID not available' } } });
      }

      const chargebeeSubscriptionData = await setupChargebeeSubscription(chargebeeCustomerId);

      // Check if chargebeeSubscriptionData.subscription is available before accessing its properties
      if (!chargebeeSubscriptionData || !chargebeeSubscriptionData.subscription || !chargebeeSubscriptionData.subscription.id) {
          return res.status(500).json({ errors: { error: { msg: 'Chargebee subscription ID not available' } } });
      }

      const chargebeeSubscriptionId = chargebeeSubscriptionData.subscription.id;

      // Continue with creating the workspace
      let slug = slugify(name.toLowerCase());
      console.log(session)
      await createWorkspace(session.token.sub, session.token.email, name, slug, chargebeeCustomerId, chargebeeSubscriptionId);

      res.status(200).json({ data: { name, slug } });
  } else {
      res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};


// Seperating Chargebee setup functions. Setup initial customer.

const setupChargebeeCustomer = async (session) => {

  const chargebeeCustomerResponse = await chargebee.customer.create({
    email: session.user.email
  }).request(function(error,result) {
    if(error){
      console.log(error);
      return result;
    } else {
      console.log(result);
    }
  });

  return(chargebeeCustomerResponse);
};


const setupChargebeeSubscription = async (chargebeeCustomerId) => {

  const chargebeeResponse = await chargebee.subscription.create_with_items(chargebeeCustomerId,{
    auto_collection: "off",
    subscription_items : [
      {
        "item_price_id" : "Free-USD-Monthly"
      }]
  }).request(function(error,result) {
    if(error){
      console.log(error);
      return result;
    } else {
      console.log(result);
    }
  });

  return chargebeeResponse;
};

export default handler;

