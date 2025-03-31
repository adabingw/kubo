
# build docker
gcloud builds submit --config polling.yml

# deploy to cloudrun
gcloud run deploy polling --image gcr.io/kubo-448922/polling-0 --service-account kubo-cloudrun@kubo-448922.iam.gserviceaccount.com --platform managed --region us-central1

