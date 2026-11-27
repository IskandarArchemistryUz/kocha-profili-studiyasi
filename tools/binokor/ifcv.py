import json, sys, ifcopenshell, ifcopenshell.geom, ifcopenshell.util.shape as US, ifcopenshell.validate
for name in ['toliq', 'seksiya']:
    f = ifcopenshell.open(f'/tmp/{name}.ifc'); exp = json.load(open(f'/tmp/{name}.json'))
    log = ifcopenshell.validate.json_logger(); ifcopenshell.validate.validate(f, log)
    print(name, 'schema:', f.schema, '| validate xatolar:', len(log.statements), [s.get('message','')[:120] for s in log.statements[:4]])
    st = ifcopenshell.geom.settings()
    def vol(t):
        tot = 0; n = 0; bad = 0
        for e in f.by_type(t):
            try:
                sh = ifcopenshell.geom.create_shape(st, e); tot += US.get_volume(sh.geometry); n += 1
            except Exception as ex: bad += 1
        return tot / 1e9, n, bad
    for t in ['IfcWall', 'IfcSlab', 'IfcColumn', 'IfcBeam', 'IfcFooting', 'IfcSpace', 'IfcWindow', 'IfcDoor', 'IfcRoof']:
        v, n, bad = vol(t)
        if n or bad: print(f'  {t}: {n} ta, hajm {v:.3f} m3' + (f', geometriya xatosi {bad}' if bad else ''))
    print('  kutilgan: devorlar', round(exp['wallV'], 3), '| plita', exp['slabV'], '| to\'sin', exp['beamV'], '| poydevor', exp['padV'], '+ lenta', exp['found']['V'] if exp['found'] and not exp['found']['est'] else 0, '| xonalar m2', exp['rooms'])
