FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# Chromium (Patchright) needs these shared libraries even in headless mode.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libatomic1 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libasound2 libx11-xcb1 \
      libxcb-dri3-0 libxss1 fonts-liberation libcairo2 \
      libpango-1.0-0 libpangocairo-1.0-0 libatspi2.0-0 libxcursor1 \
    && rm -rf /var/lib/apt/lists/*

COPY scraper/requirements.txt ./scraper/requirements.txt
RUN pip install --no-cache-dir -r scraper/requirements.txt

# Stealth fallback browser. Fetcher handles normal requests; this is used
# only when IDX answers with a Cloudflare challenge.
RUN python -m patchright install chromium

COPY scraper ./scraper

EXPOSE 8001
CMD ["uvicorn", "scraper.app:app", "--host", "0.0.0.0", "--port", "8001"]
