import { type CreateDepositInput, type Deposit } from '../schema';

export async function createDeposit(input: CreateDepositInput): Promise<Deposit> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to create a new deposit request.
    // Implementation should:
    // 1. Set appropriate target numbers based on payment method:
    //    - DANA: 083176891367
    //    - OVO: 083194537338
    //    - GoPay: 083194537338
    //    - QRIS: no target number needed
    // 2. Validate that QRIS deposits include proof_image_url
    // 3. Create deposit record with PENDING status
    // 4. Return the created deposit
    
    let target_number = null;
    switch (input.payment_method) {
        case 'DANA':
            target_number = '083176891367';
            break;
        case 'OVO':
        case 'GOPAY':
            target_number = '083194537338';
            break;
        case 'QRIS':
            // No target number for QRIS
            break;
    }
    
    return Promise.resolve({
        id: 0, // Placeholder ID
        user_id: input.user_id,
        amount: input.amount,
        payment_method: input.payment_method,
        target_number,
        proof_image_url: input.proof_image_url || null,
        status: 'PENDING',
        admin_response_image_url: null,
        admin_notes: null,
        created_at: new Date(),
        updated_at: new Date()
    } as Deposit);
}