from google.cloud import firestore
from google.cloud import pubsub_v1
from flask import Flask
from collections import defaultdict

from constants.endpoints import QUERY_NEXT_SERVICE, QUERY_INFO_ALERTS, QUERY_SERVICE_ALERTS, QUERY_EXCEPTIONS
from constants.api import request
from constants.firestore import FIRESTORE_SUBSCRIPTION_COLLECTION
from constants.pubsub import PUBSUB_PROJECT_ID

import json
import logging

publisher = pubsub_v1.PublisherClient()
app = Flask(__name__)
db = firestore.Client(database='(default)')
logging.basicConfig(level=logging.DEBUG)
type_to_query = {
    "stop": QUERY_NEXT_SERVICE,
    "information-alert": QUERY_INFO_ALERTS,
    "service-alert": QUERY_SERVICE_ALERTS,
    'exception': QUERY_EXCEPTIONS
}

def publish_message(message, topic):
    try:
        message_data = json.dumps(message).encode("utf-8")

        topic_path = publisher.topic_path(PUBSUB_PROJECT_ID, topic)
        logging.debug(f"{topic_path}, {topic}")
        
        future = publisher.publish(topic_path, message_data)

        # Wait for the publish call to complete and return the message ID
        message_id = future.result()
        logging.debug(f"Message published with ID: {message_id}")
    except Exception as e:
        logging.debug(f"Error publishing message: {e}")

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
        # DEBUG:root:[{'service-alert': {'type': 'service-alert'}, 'information-alert': {'type': 'information-alert'}, 'exception': {'type': 'exception'}, 'stop-UN': {'type': 'stop', 'users': ['test'], 'params': {'stopCode': 'UN'}}}]

        # query from api
        data = defaultdict(list)
        subscriptions = db_data[0]
        
        for i, (topic, body) in enumerate(subscriptions.items()):
            if not body['type']:
                logging.error(f"This data has no type ")
                
            subscription_type = body['type']
            logging.debug(f"{i}, {subscription_type}, {topic}")
            
            if subscription_type in type_to_query:
                query = type_to_query[subscription_type]
                payload = body.get('params', {})
                res = request(query, payload)
            
                if not res:
                    return {
                        'status': 502,
                        'message': 'Error querying endpoint'
                    }
            
                result = json.loads(json.dumps(res))
            
                if result['Metadata']['ErrorCode'] == '200':
                    
                    if subscription_type == 'stop':
                        updates = result['NextService']['Lines']
                        publish_message(updates, topic)
                    
                    elif subscription_type == 'information-alert' or subscription_type == 'service-alert':
                        updates = result['Messages']['Message']
                        publish_message(updates, topic)
            
            else:
                return {
                    'status': 404,
                    'message': 'Cannot find type query'
                }

            logging.debug(data)

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
