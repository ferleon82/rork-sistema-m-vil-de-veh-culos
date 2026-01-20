export type VehicleDiagnosticIssue = {
  id: string;
  label: string;
};

export type VehicleDiagnosticCategory = {
  id: string;
  label: string;
  issues: VehicleDiagnosticIssue[];
};

export const VEHICLE_DIAGNOSTICS: VehicleDiagnosticCategory[] = [
  {
    id: 'brakes',
    label: 'Sistema de frenos',
    issues: [
      { id: 'brake_pads_worn', label: 'Pastillas de freno desgastadas' },
      { id: 'brake_discs_warped', label: 'Discos alabeados / vibración al frenar' },
      { id: 'brake_fluid_low', label: 'Líquido de frenos bajo / fuga' },
      { id: 'brake_pedal_spongy', label: 'Pedal esponjoso / aire en el sistema' },
      { id: 'brake_noise', label: 'Ruido al frenar (chirrido/metal)' },
      { id: 'abs_warning', label: 'Luz ABS encendida / falla ABS' },
      { id: 'parking_brake', label: 'Freno de mano no sostiene / desajuste' },
      { id: 'brake_caliper', label: 'Caliper pegado / freno recalentado' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'engine',
    label: 'Motor',
    issues: [
      { id: 'engine_check_light', label: 'Luz de Check Engine encendida' },
      { id: 'engine_misfire', label: 'Falla de encendido / tironeos' },
      { id: 'engine_oil_leak', label: 'Fuga de aceite' },
      { id: 'engine_overheating', label: 'Sobrecalentamiento' },
      { id: 'engine_hard_start', label: 'Arranque difícil / no arranca' },
      { id: 'engine_idle_rough', label: 'Ralentí inestable' },
      { id: 'engine_power_loss', label: 'Pérdida de potencia' },
      { id: 'engine_smoke', label: 'Humo excesivo (azul/negro/blanco)' },
      { id: 'engine_noise', label: 'Ruidos (cascabeleo/golpeteo)' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'cooling',
    label: 'Sistema de enfriamiento',
    issues: [
      { id: 'coolant_leak', label: 'Fuga de refrigerante' },
      { id: 'radiator_issue', label: 'Radiador obstruido / dañado' },
      { id: 'thermostat', label: 'Termostato defectuoso' },
      { id: 'water_pump', label: 'Bomba de agua con falla' },
      { id: 'fan_not_working', label: 'Ventilador no enciende' },
      { id: 'coolant_low', label: 'Refrigerante bajo' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'transmission',
    label: 'Transmisión',
    issues: [
      { id: 'trans_slipping', label: 'Patinaje / cambios resbalan' },
      { id: 'trans_hard_shift', label: 'Cambios bruscos / golpeteo' },
      { id: 'trans_fluid_leak', label: 'Fuga de aceite de transmisión' },
      { id: 'trans_noise', label: 'Ruidos (zumbido/ronquido)' },
      { id: 'clutch_worn', label: 'Embrague desgastado (manual)' },
      { id: 'trans_warning', label: 'Testigo de transmisión / modo emergencia' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'suspension',
    label: 'Suspensión',
    issues: [
      { id: 'shocks_worn', label: 'Amortiguadores desgastados' },
      { id: 'bushings', label: 'Bujes deteriorados / ruidos' },
      { id: 'ball_joints', label: 'Rótulas con juego' },
      { id: 'suspension_noise', label: 'Golpeteo al pasar baches' },
      { id: 'vehicle_pulls', label: 'Vehículo se va hacia un lado' },
      { id: 'uneven_tire_wear', label: 'Desgaste irregular de llantas' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'steering',
    label: 'Dirección',
    issues: [
      { id: 'steering_hard', label: 'Dirección dura' },
      { id: 'steering_noise', label: 'Ruido al girar' },
      { id: 'power_steering_leak', label: 'Fuga hidráulica (dirección)' },
      { id: 'alignment', label: 'Alineación fuera de especificación' },
      { id: 'steering_vibration', label: 'Vibración en el volante' },
      { id: 'tie_rods', label: 'Terminales / barras con juego' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'electrical',
    label: 'Sistema eléctrico',
    issues: [
      { id: 'battery_weak', label: 'Batería descargada / débil' },
      { id: 'alternator', label: 'Alternador no carga' },
      { id: 'starter', label: 'Motor de arranque con falla' },
      { id: 'fuse', label: 'Fusible quemado / circuito abierto' },
      { id: 'wiring', label: 'Cableado en mal estado / falso contacto' },
      { id: 'parasitic_draw', label: 'Consumo parasitario (descarga)' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'lighting',
    label: 'Luces y señalización',
    issues: [
      { id: 'headlight_out', label: 'Faro / bombillo quemado' },
      { id: 'brake_light_out', label: 'Luz de stop no funciona' },
      { id: 'turn_signal', label: 'Direccional intermitente / no funciona' },
      { id: 'fog_lights', label: 'Neblineros no funcionan' },
      { id: 'wiring_lighting', label: 'Conector / cableado de luces con falla' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'ac',
    label: 'Aire acondicionado / climatización',
    issues: [
      { id: 'ac_not_cooling', label: 'No enfría' },
      { id: 'ac_bad_smell', label: 'Mal olor en cabina' },
      { id: 'ac_noise', label: 'Ruido del compresor / polea' },
      { id: 'ac_leak', label: 'Fuga de gas refrigerante' },
      { id: 'cabin_filter', label: 'Filtro de cabina sucio' },
      { id: 'blower', label: 'Ventilador interno no funciona' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'fuel',
    label: 'Sistema de combustible',
    issues: [
      { id: 'fuel_pump', label: 'Bomba de combustible con falla' },
      { id: 'injectors', label: 'Inyectores sucios / fallando' },
      { id: 'fuel_filter', label: 'Filtro de combustible obstruido' },
      { id: 'fuel_leak', label: 'Fuga de combustible' },
      { id: 'high_consumption', label: 'Consumo elevado' },
      { id: 'fuel_smell', label: 'Olor a combustible' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'exhaust',
    label: 'Escape / emisiones',
    issues: [
      { id: 'exhaust_leak', label: 'Fuga en el escape' },
      { id: 'catalyst', label: 'Catalizador con falla' },
      { id: 'o2_sensor', label: 'Sensor de oxígeno con falla' },
      { id: 'smoke_emissions', label: 'Emisiones fuera de norma / humo' },
      { id: 'muffler_noise', label: 'Escape ruidoso / silenciador dañado' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'tires_wheels',
    label: 'Llantas y ruedas',
    issues: [
      { id: 'tire_puncture', label: 'Pinchazo / pérdida de aire' },
      { id: 'tire_worn', label: 'Llantas desgastadas' },
      { id: 'balance', label: 'Balanceo requerido' },
      { id: 'rim_damage', label: 'Rin doblado / dañado' },
      { id: 'wheel_bearing', label: 'Rodamiento de rueda ruidoso' },
      { id: 'tire_pressure', label: 'Presión incorrecta / sensor TPMS' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'maintenance',
    label: 'Mantenimiento preventivo',
    issues: [
      { id: 'oil_change', label: 'Cambio de aceite' },
      { id: 'filters', label: 'Cambio de filtros (aire/aceite/cabina)' },
      { id: 'spark_plugs', label: 'Bujías / bobinas (revisión/cambio)' },
      { id: 'timing_belt', label: 'Correa de distribución / tiempo' },
      { id: 'fluid_topup', label: 'Reposición de fluidos' },
      { id: 'general_inspection', label: 'Revisión general' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'interior',
    label: 'Interior y confort',
    issues: [
      { id: 'windows', label: 'Elevalunas no funciona' },
      { id: 'central_lock', label: 'Cierre centralizado con falla' },
      { id: 'dashboard_lights', label: 'Testigos / tablero con falla' },
      { id: 'audio', label: 'Audio / radio no funciona' },
      { id: 'seat_belts', label: 'Cinturones / anclajes con falla' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'safety_sensors',
    label: 'Seguridad y sensores',
    issues: [
      { id: 'airbag_light', label: 'Luz de airbag encendida' },
      { id: 'parking_sensors', label: 'Sensores de parqueo con falla' },
      { id: 'camera', label: 'Cámara de reversa no funciona' },
      { id: 'abs_sensors', label: 'Sensor ABS / velocidad de rueda con falla' },
      { id: 'tpms', label: 'TPMS / sensor de presión con falla' },
      { id: 'scan_codes', label: 'Escaneo de códigos / diagnóstico OBD' },
      { id: 'other', label: 'Otros' },
    ],
  },
  {
    id: 'other',
    label: 'Otros',
    issues: [
      { id: 'other', label: 'Otros' },
    ],
  },
];

export const findDiagnosticCategory = (categoryId?: string) =>
  VEHICLE_DIAGNOSTICS.find((category) => category.id === categoryId);

export const findDiagnosticIssueLabel = (categoryId?: string, issueId?: string) => {
  const category = findDiagnosticCategory(categoryId);
  const issue = category?.issues.find((i) => i.id === issueId);
  return {
    categoryLabel: category?.label,
    issueLabel: issue?.label,
  };
};
