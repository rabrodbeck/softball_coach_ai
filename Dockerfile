# Use the official lightweight Python image
FROM python:3.9-slim

# Install system dependencies needed for compiling certain packages (like psycopg2)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the rest of the application files
COPY . .

# Hugging Face Spaces automatically listens on port 7860 for Docker containers
EXPOSE 7860

# Run uvicorn server, mapping the host to 0.0.0.0 and port to 7860
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860"]