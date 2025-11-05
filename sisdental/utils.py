import decimal
import datetime

def format_for_json(data):
    """Formata recursivamente dados (listas/dicionários) para serem compatíveis com JSON."""
    if isinstance(data, list):
        return [format_for_json(item) for item in data]
    if isinstance(data, dict):
        formatted_dict = {}
        for key, value in data.items():
            if isinstance(value, decimal.Decimal):
                formatted_dict[key] = float(value)
            elif isinstance(value, (datetime.datetime, datetime.date)):
                formatted_dict[key] = value.isoformat() if value else None
            elif isinstance(value, datetime.time):
                 formatted_dict[key] = value.strftime('%H:%M:%S') if value else None
            elif isinstance(value, datetime.timedelta):
                 total_seconds = int(value.total_seconds())
                 hours, remainder = divmod(total_seconds, 3600)
                 minutes, seconds = divmod(remainder, 60)
                 formatted_dict[key] = f"{hours:02}:{minutes:02}:{seconds:02}"
            else:
                formatted_dict[key] = value
        return formatted_dict
    return data
