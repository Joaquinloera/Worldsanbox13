"""KINO concurrent research coordinator with evidence validation."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

TRACKS = ('CHINA_CIPS', 'BRAZIL_PIX', 'MEXICO_SPEI', 'INDIA_UPI', 'SOUTH_AFRICA_PAYSHAP', 'NDB_BRICS')

def validate_evidence(item):
    if not isinstance(item, dict) or not item.get('agent') or not item.get('findings'):
        raise ValueError('Missing agent or findings')
    sources = item.get('sources')
    if not isinstance(sources, list) or not sources:
        raise ValueError('Sources required')
    for source in sources:
        parsed = urlparse(source)
        if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.password:
            raise ValueError('Invalid evidence URL')
    return item

def swarm(researchers, max_workers=6):
    """Run independently injected agent adapters concurrently, with evidence gates."""
    if not isinstance(researchers, dict) or not researchers:
        raise ValueError('Research agents required')
    if any(track not in TRACKS for track in researchers):
        raise ValueError('Unknown track')
    results, errors = {}, {}
    with ThreadPoolExecutor(max_workers=min(max_workers, len(researchers))) as pool:
        futures = {pool.submit(fn): name for name, fn in researchers.items()}
        for future in as_completed(futures):
            name = futures[future]
            try:
                results[name] = validate_evidence(future.result())
            except Exception as exc:
                errors[name] = type(exc).__name__ + ': ' + str(exc)
    return {'workflow': 'SWARM_SKIM_CROSSCHECK', 'results': results, 'errors': errors, 'live_transfers': 0}
