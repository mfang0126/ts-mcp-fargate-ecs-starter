FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV PYTHONUNBUFFERED=1

# Run FastMCP server
CMD ["python", "server.py"]
