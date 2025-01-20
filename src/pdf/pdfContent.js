module.exports = {
	//{ qr: 'Clave de Acceso:2911202201091196402100120011000000000052911100110', fit: '100' },
	header: {
		columns: [
			{ text: ' ', style: 'documentHeaderLeft' },

			{ text: ' ', style: 'documentHeaderRight' },

		]
	},
	footer: {},
	content: [
		// Header
		{
			columns: [
				{
					qr: ' ', fit: '100'
				},

				[
					{
						text: 'FACTURA',
						style: 'invoiceTitle',
						width: '*'
					},
					{
						stack: [
							{
								columns: [
									{
										text: 'Factura Nº', style: 'invoiceSubTitle', width: '*'

									},
									{
										text: ' ', style: 'invoiceSubValuenumero', width: 150

									}
								]
							},
							{
								columns: [
									{
										text: 'Estado',
										style: 'invoiceSubTitle',
										width: '*'
									},
									{
										text: '',
										style: 'invoiceSubValue',
										width: 150
									}
								]
							},
							{
								columns: [
									{
										text: 'Fecha Autorización',
										style: 'invoiceSubTitle',
										width: '*'
									},
									{
										text: '',
										style: 'invoiceSubValue',
										width: 150
									}
								]
							},

							{
								columns: [
									{
										text: 'Ambiente',
										style: 'invoiceSubTitle',
										width: '*'
									},
									{
										text: '',
										style: 'invoiceSubValue',
										width: 150
									}
								]
							},

							{
								columns: [
									{
										text: 'Emision',
										style: 'invoiceSubTitle',
										width: '*'
									},
									{
										text: '',
										style: 'invoiceSubValue',
										width: 150
									}
								]
							},
							{
								columns: [

									{
										text: '_________________________________________________________\n Numero de Autorización',
										style: 'invoiceautoriza',
										width: 270
									}
								]
							},
							{
								columns: [

									{
										text: '',
										style: 'invoiceclaveacc',
										width: 270
									}
								]
							},
						]
					}
				],
			],
		},
		// Billing Headers
		{
			columns: [
				{
					text: 'Remitente',
					style: 'invoiceBillingTitle',

				},
				{
					text: 'Cliente',
					style: 'invoiceBillingTitle',

				},
			]
		},
		// Billing Details
		{
			columns: [
				{
					text: '',
					style: 'invoiceBillingDetails'
				},
				{
					text: '',
					style: 'invoiceBillingDetails'
				},
			]
		},
		// Billing Address Title
		{
			columns: [
				{
					text: 'Matriz',
					style: 'invoiceBillingAddressTitle'
				},
				{
					text: 'RUC/CI',
					style: 'invoiceBillingAddressTitle'
				},
			]
		},
		// Billing Address
		{
			columns: [
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
			]
		},

		// Billing Nombre
		{
			columns: [
				{
					text: 'Nombre',
					style: 'invoiceBillingAddressTitle'
				},
				{
					text: 'Direccion',
					style: 'invoiceBillingAddressTitle'
				},
			]
		},
		// Billing  Nombre
		{
			columns: [
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
			]
		},

		// Billing Teléfono
		{
			columns: [
				{
					text: 'Teléfono',
					style: 'invoiceBillingAddressTitle'
				},
				{
					text: 'E-mail',
					style: 'invoiceBillingAddressTitle'
				},
			]
		},
		// Billing Teléfono
		{
			columns: [
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
			]
		},


		// Billing E-mail: 
		{
			columns: [
				{
					text: 'E-mail',
					style: 'invoiceBillingAddressTitle'
				},
				{
					text: 'Teléfono',
					style: 'invoiceBillingAddressTitle'
				},
			]
		},
		// Billing E-mail: 
		{
			columns: [
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
			]
		},

		// Billing Agente de Retencion: 
		{
			columns: [
				{
					text: 'Agente de Retencion',
					style: 'invoiceBillingAddressTitle'
				},
				{
					text: ' ',
					style: 'invoiceBillingAddressTitle'
				},
			]
		},
		// Billing Agente de Retencion 
		{
			columns: [
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
			]
		},

		// Billing Res. No.
		{
			columns: [
				{
					text: 'Res. No.',
					style: 'invoiceBillingAddressTitle'
				},
				{
					text: ' ',
					style: 'invoiceBillingAddressTitle'
				},
			]
		},
		// Billing Res. No.
		{
			columns: [
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
				{
					text: ' ',
					style: 'invoiceBillingAddress'
				},
			]
		},
		// Line breaks\n
		'\n',
		// Items

		{
			table: {
				// headers are automatically repeated if the table spans over multiple pages
				// you can declare how many rows should be treated as headers
				headerRows: 1,
				widths: ['*', 'auto', 'auto', 80],

				body: [
					// Table Header
					[
						{
							text: 'Descripción',
							style: 'itemsHeader'
						},
						{
							text: 'Cantidad',
							style: ['itemsHeader', 'center']
						},
						{
							text: 'Precio unitario',
							style: ['itemsHeader', 'center']
						},

						{
							text: 'Total',
							style: ['itemsHeader', 'center']
						}
					],
					// Items
					// Item 1



					// END Items
				],

			}, // table
			layout: 'lightHorizontalLines',
			//  layout: 'lightHorizontalLines'
		},
		// TOTAL
		{
			table: {
				// headers are automatically repeated if the table spans over multiple pages
				// you can declare how many rows should be treated as headers
				headerRows: 0,
				widths: ['*', 80],

				body: [
					// Total
					[
						{
							text: 'Subtotal',
							style: 'itemsFooterSubTitle'
						},
						{
							text: ' ',
							style: 'itemsFooterSubValue'
						}
					],
					[
						{
							text: 'Descuento',
							style: 'itemsFooterSubTitle'
						},
						{
							text: ' ',
							style: 'itemsFooterSubValue'
						}
					],
					[
						{
							text: 'Subtotal con descuento',
							style: 'itemsFooterSubTitle'
						},
						{
							text: ' ',
							style: 'itemsFooterSubValue'
						}
					],
					[
						{
							text: 'Impuestos',
							style: 'itemsFooterSubTitle'
						},
						{
							text: ' ',
							style: 'itemsFooterSubValue'
						}
					],
					[
						{
							text: 'TOTAL',
							style: 'itemsFooterTotalTitle'
						},
						{
							text: ' ',
							style: 'itemsFooterTotalValue'
						}
					],
				]
			}, // table
			layout: 'lightHorizontalLines'
		},
		// Signature
		
		{
			text: 'Forma de Pago',
			style: 'notesTitle'
		},
		{
			text: 'Some notes goes here \n Notes second line',
			style: 'notesText'
		}
	],
	styles: {
		// Document Header

	},
	defaultStyle: {
		columnGap: 0,
	}
}