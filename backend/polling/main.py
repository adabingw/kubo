from google.cloud import firestore
from google.cloud import pubsub_v1
from flask import Flask
from collections import defaultdict

from constants.api import request, QUERY_NEXT_SERVICE
from constants.firestore import FIRESTORE_SUBSCRIPTION_COLLECTION
from constants.pubsub import PUBSUB_PROJECT_ID

import json
import logging

publisher = pubsub_v1.PublisherClient()
app = Flask(__name__)
db = firestore.Client(database='(default)')
logging.basicConfig(level=logging.DEBUG)

def polling():
    """
    Query subscriptions from Firestore.
    Returns a list of user subscriptions with details.
    """
    try:
        # Reference the 'subscriptions' collection
        subscriptions_ref = db.collection(FIRESTORE_SUBSCRIPTION_COLLECTION)

        # Query all subscriptions
        docs = subscriptions_ref.stream()

        # Parse and store the results
        db_data = []
        for doc in docs:
            subscription = doc.to_dict()

            # Add the subscription to the list
            db_data.append(subscription)
    
        logging.debug(db_data)
        # DEBUG:root:[{'LO': 'stop-LO', '00147': 'stop-00147', 'UN': 'stop-UN'}]

        # query from api
        data = defaultdict(list)
        subscriptions = db_data[0]
        
        for i, (stop, d) in enumerate(subscriptions.items()):
            topic = d['topic']
            logging.debug(f"{i}, {stop}, {topic}")
            
            payload = [stop]
            res = request(QUERY_NEXT_SERVICE, payload)
            
            if not res:
                return "404"
            
            result = json.loads(json.dumps(res))
            
            if result['Metadata']['ErrorCode'] == '200':
                updates = result['NextService']['Lines']
                for update in updates:
                    stopCode = update['StopCode']
                    data[stopCode].append(update)

            logging.debug(data)
            
        if data:
            try:
                # Encode the message as bytes
                for stop, datum in data.items():
                    message_data = json.dumps(datum).encode("utf-8")

                    topic_id = subscriptions[stop]
                    topic_path = publisher.topic_path(PUBSUB_PROJECT_ID, topic_id)
                    logging.debug(f"{topic_path}, {topic_id}")
                    
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

@app.route('/')
def main():
    polling()
    
    return []

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080)
