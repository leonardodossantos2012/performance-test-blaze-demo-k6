/**
 * Serviço para geração de dados aleatórios para testes
 */

/**
 * Gera dados aleatórios de um passageiro
 * @returns {Object} Dados do passageiro incluindo nome, endereço e informações de cartão
 */
export function generatePassengerData() {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const addresses = ['123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm St', '654 Maple Dr'];
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
  const states = ['NY', 'CA', 'IL', 'TX', 'AZ'];
  const zipCodes = ['10001', '90001', '60601', '77001', '85001'];
  const cards = ['4111111111111111', '5555555555554444', '4000000000000002'];
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const years = ['2025', '2026', '2027', '2028', '2029'];

  return {
    inputName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    address: addresses[Math.floor(Math.random() * addresses.length)],
    city: cities[Math.floor(Math.random() * cities.length)],
    state: states[Math.floor(Math.random() * states.length)],
    zipCode: zipCodes[Math.floor(Math.random() * zipCodes.length)],
    cardType: 'visa',
    creditCardNumber: cards[Math.floor(Math.random() * cards.length)],
    creditCardMonth: months[Math.floor(Math.random() * months.length)],
    creditCardYear: years[Math.floor(Math.random() * years.length)],
    nameOnCard: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
  };
}

/**
 * Seleciona cidades aleatórias de origem e destino
 * @returns {Object} Objeto com fromPort e toPort
 */
export function getRandomCities() {
  const fromCities = ['Paris', 'Philadelphia', 'Boston', 'Portland', 'San Diego', 'Mexico City', 'São Paolo'];
  const toCities = ['Buenos Aires', 'Rome', 'London', 'Berlin', 'New York', 'Dublin', 'Cairo'];
  
  return {
    fromPort: fromCities[Math.floor(Math.random() * fromCities.length)],
    toPort: toCities[Math.floor(Math.random() * toCities.length)],
  };
}

