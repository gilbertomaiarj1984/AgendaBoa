// Agenda escolar da Julia: tabela fixa de aulas (sem datas). Para mudar, edite este arquivo.
// Cada linha é um horário; as 5 matérias são segunda, terça, quarta, quinta e sexta, nessa ordem.
export const AULAS: { start: string; end: string; materias: [string, string, string, string, string] }[] = [
  { start: "07:05", end: "07:55", materias: ["Língua Portuguesa", "Matemática", "Matemática", "Língua Portuguesa", "Matemática"] },
  { start: "07:55", end: "08:45", materias: ["Língua Portuguesa", "Matemática", "Thinking", "Língua Portuguesa", "Matemática"] },
  { start: "09:10", end: "10:00", materias: ["Educação Física", "Ensino Religioso e Espiritualidade", "História", "Produção Textual", "Ciências"] },
  { start: "10:00", end: "10:50", materias: ["Thinking", "Arte", "Educação Física", "Geografia", "Ciências"] },
  { start: "10:50", end: "11:40", materias: ["Thinking", "Hands on", "História", "Geografia", "Produção Textual"] },
];
