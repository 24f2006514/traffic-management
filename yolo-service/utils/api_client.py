"""Small helper to send alerts/results to the backend API."""
import requests


def post_alert(url, payload, timeout=2):
    try:
        r = requests.post(url, json=payload, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print('Failed to post alert:', e)
        return None


if __name__ == '__main__':
    print('api_client helper')
