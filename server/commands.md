## gke commands
### build docker
docker build --no-cache -f ./server.dockerfile -t kubo-server .
docker run -p 3000:80 kubo-server

### push to gcr
docker tag kubo-server us-central1-docker.pkg.dev/kubo-448922/kubo-server/server:latest
gcloud auth configure-docker us-central1-docker.pkg.dev
docker push us-central1-docker.pkg.dev/kubo-448922/kubo-server/server:latest

### k8s commands
kubectl delete -f ./manifests/deployment.yaml
kubectl apply -f ./manifests
kubectl describe ingress kubo-server-ingress
