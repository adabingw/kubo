from google.cloud import firestore
from google.cloud import pubsub_v1
from flask import Flask

from constants.api import request, QUERY_FLIGHT_DETAILS
from constants.firestore import FIRESTORE_SUBSCRIPTION_COLLECTION
from constants.pubsub import PUBSUB_PROJECT_ID, PUBSUB_TOPIC_ID

import json
import logging

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PUBSUB_PROJECT_ID, PUBSUB_TOPIC_ID)
app = Flask(__name__)
db = firestore.Client(database=FIRESTORE_SUBSCRIPTION_COLLECTION)
logging.basicConfig(level=logging.DEBUG)

@app.route('/')
def main():
    """
    Query flight subscriptions from Firestore.
    Returns a list of user subscriptions with details.
    """
    try:
        # Reference the 'subscriptions' collection
        subscriptions_ref = db.collection(FIRESTORE_SUBSCRIPTION_COLLECTION)

        # Query all subscriptions
        docs = subscriptions_ref.stream()

        # Parse and store the results
        subscriptions = []
        for doc in docs:
            subscription = doc.to_dict()

            # Add the subscription to the list
            subscriptions.append(subscription)
    
        logging.debug(subscriptions)
        # "DEBUG:root:[{'F8801': {'from': 'YYC', 'to': 'YVR', 'subscribers': ['user1', 'user2'], 
        # 'num': 'F8801', 'token': 'xxx'}]"

        # query from api
        data = []
        for subscription in subscriptions:
            logging.debug(subscription)
            for _, v in subscription.items():
                logging.debug(v)
                if not (isinstance(v, dict) and 'token' in v):
                    continue
                
                payload = [
                    v['token']
                ]
                result = json.loads(request(QUERY_FLIGHT_DETAILS, payload))
                
                logging.debug(result)
                
                logging.debug(type(result))
                
                if result['status'] == True and result['data'] and result['data']['priceBreakdown']:
                    price = result['data']['priceBreakdown']
                    logging.debug(price)
                    processedFlight = {
                        **v,
                        'price': price['total']['units']
                    }
                    data.append(processedFlight)
        
        logging.debug(data)
            
        if data:
            try:
                # Encode the message as bytes
                message_data = json.dumps(data).encode("utf-8")

                # Publish the message to the topic
                future = publisher.publish(topic_path, message_data)

                # Wait for the publish call to complete and return the message ID
                message_id = future.result()
                logging.debug(f"Message published with ID: {message_id}")

            except Exception as e:
                logging.debug(f"Error publishing message: {e}")
                

    except Exception as e:
        logging.debug(f"Error querying Firestore: {e}")
        return []

    return []

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080)
