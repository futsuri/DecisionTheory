FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Системные зависимости для matplotlib (шрифты, рендеринг PNG/PDF)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libfontconfig1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app
COPY run.py /app/run.py
COPY frontend /app/frontend

RUN mkdir -p /app/reports

EXPOSE 8000

CMD ["gunicorn", "-b", "0.0.0.0:8000", "-w", "2", "--timeout", "120", "run:app"]