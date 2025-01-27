# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file first to leverage Docker's caching
COPY polling/requirements.txt /app/requirements.txt

# Install Python dependencies explicitly
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy only the polling and constants directories into the container
COPY polling /app/polling
COPY constants /app/constants

# Set the PYTHONPATH to include /app so you can import modules from constants
ENV PYTHONPATH="/app:${PYTHONPATH}"

EXPOSE 8080

# Run the main.py script as the entry point
CMD ["python", "/app/polling/main.py"]
