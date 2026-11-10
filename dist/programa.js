// Fuente: cartel final del XIII Foro (formato tabloide).
// `speaker` es el nombre del participante (se usa en los aplausos); `institucion` solo se muestra junto al nombre.
export const programa = {
  jueves: {
    label: 'Jueves 12 de noviembre',
    date: '2026-11-12',
    activities: [
      { start: '09:10', end: '09:40', title: 'Inauguración' },
      { start: '09:40', end: '10:40', title: 'Conferencia magistral: Computación, Inteligencia y Diversidad', speaker: 'Dr. Edgard Iván Benítez Guerrero', institucion: 'UV' },
      { start: '10:40', end: '11:00', session: 'Sesión I · Aplicaciones de la IA', title: "Más Allá del 'Vibe-Coding': Fundamentos de Ingeniería de Software Dirigida por Modelos para la Creación Autónoma de Videojuegos Serios usando IA", speaker: 'Juan Carlos Venegas Aburto' },
      { start: '11:00', end: '11:20', session: 'Sesión I · Aplicaciones de la IA', title: 'Anatomía de la Súper-Resolución de Imagen Única: cómo trabaja una CNN, etapa por etapa', speaker: 'Emmanuel Morales García' },
      { start: '11:20', end: '11:40', session: 'Sesión I · Aplicaciones de la IA', title: 'Hacia un riego de precisión para la malanga: IoT e IA', speaker: 'Javier Sánchez Acosta' },
      { start: '11:40', end: '11:50', title: 'Receso', kind: 'break' },
      { start: '11:50', end: '12:10', session: 'Sesión II · IHC, Inclusión y Accesibilidad', title: 'Señales del corazón en la IHC: emociones a través de la variabilidad cardiaca', speaker: 'Alma Rosa Galindo Monfil' },
      { start: '12:10', end: '12:30', session: 'Sesión II · IHC, Inclusión y Accesibilidad', title: 'Evaluación de la Experiencia de Usuario con personas Sordas: Barreras, Métodos y Adaptaciones', speaker: 'Andrés Eduardo Fuentes Cortázar' },
      { start: '12:30', end: '12:50', session: 'Sesión II · IHC, Inclusión y Accesibilidad', title: 'Computación neuroinclusiva aplicada al TDAH', speaker: 'Eva Lissette Paredes Cabrera' },
      { start: '12:50', end: '13:10', session: 'Sesión II · IHC, Inclusión y Accesibilidad', title: 'Hacia un estudio de identificación de carga cognitiva utilizando datos de seguimiento ocular.', speaker: 'Gerardelli Santiago Cruz' },
      { start: '13:10', end: '13:30', session: 'Sesión II · IHC, Inclusión y Accesibilidad', title: 'Modelo conceptual para la remediación de barreras de accesibilidad web mediante IA', speaker: 'Guillermo Humberto Vera Amaro' },
      { start: '13:30', end: '13:40', title: 'Receso', kind: 'break' },
      { start: '13:40', end: '14:20', title: 'Presentación de carteles', speaker: 'Estudiantes MSICU' }
    ]
  },
  viernes: {
    label: 'Viernes 13 de noviembre',
    date: '2026-11-13',
    activities: [
      { start: '09:10', end: '10:10', title: 'Conferencia magistral: Divulgación Científica en Tiempos de Cambio: Retos, Oportunidades y Nuevas Formas de acercar el Conocimiento a la Sociedad', speaker: 'Dra. Karina Figueroa Mora', institucion: 'UMIHC' },
      { start: '10:10', end: '10:30', session: 'Sesión III · IS y Visualización de Información', title: '¿Qué cambia en la Ingeniería de Requisitos cuando el software aprende?', speaker: 'Maria Lucía López Araujo' },
      { start: '10:30', end: '10:50', session: 'Sesión III · IS y Visualización de Información', title: 'Modelo conceptual de adaptabilidad para visualizar información en tecnologías para ciudades inteligentes', speaker: 'Irma Elizabeth Romero Arrioja' },
      { start: '10:50', end: '11:10', session: 'Sesión III · IS y Visualización de Información', title: 'Hacia un modelo conceptual de la visualización de software en el mantenimiento: conceptos y relaciones', speaker: 'Alma Rosa Córdova Aguilar' },
      { start: '11:10', end: '11:30', title: 'Del código fuente a la Divulgación en La Ciencia', speaker: 'Mtra. D. Mariana Morales Murrieta', institucion: 'UV' },
      { start: '11:30', end: '11:40', title: 'Receso', kind: 'break' },
      { start: '11:40', end: '12:00', session: 'Sesión IV · Colaboración por Computadora', title: 'Análisis del flujo clínico e integración multimodal para apoyo de tareas médicas en DM2', speaker: 'Emilio Antonio Alarcón Santos' },
      { start: '12:00', end: '12:20', session: 'Sesión IV · Colaboración por Computadora', title: 'Hacia la colaboración entre desarrolladores y pares virtuales', speaker: 'Dora Angélica Ávila Galván' },
      { start: '12:20', end: '12:40', session: 'Sesión IV · Colaboración por Computadora', title: 'Hacia un método computacional para la evaluación de la colaboración en entornos colocalizados', speaker: 'José Pablo Rueda Holguín' },
      { start: '12:40', end: '13:00', session: 'Sesión IV · Colaboración por Computadora', title: 'Simulando colaboración humana: modelo computacional que integra regulación social, organización y cognición.', speaker: 'Daniel Sandria Flores' },
      { start: '13:00', end: '13:10', title: 'Receso', kind: 'break' },
      { start: '13:10', end: '14:10', title: 'Panel: Mejores prácticas en la Divulgación de la Ciencia', speaker: 'Moderan: Dr. Luis G. Montané y Dr. Octavio Ocharán' },
      { start: '14:10', end: '14:40', title: 'Clausura' }
    ]
  }
};
